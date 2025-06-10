const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const Minio = require('minio');
const PDFDocument = require('pdfkit');
const docx = require('docx');
const { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, BorderStyle } = docx;

const prisma = new PrismaClient();

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: '127.0.0.1',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});

const bucketName = 'mop-gen-exports';

// Ensure export bucket exists
async function ensureExportBucketExists() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log('Export bucket created successfully');
    }
  } catch (err) {
    console.error('Error ensuring export bucket exists:', err);
    throw err;
  }
}

/**
 * Export MOP to specified format
 */
async function exportMOP(req, res) {
  const { id } = req.params;
  const format = req.query.format || 'pdf';
  
  try {
    // Ensure export bucket exists
    await ensureExportBucketExists();
    
    // Get MOP from database
    const mop = await prisma.mOP.findUnique({
      where: { id }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    // Get document for extracted data
    const doc = await prisma.document.findUnique({
      where: { id: mop.documentId }
    });
    
    if (!doc) {
      return res.status(404).json({ message: 'Associated document not found' });
    }
    
    // Get reviews
    const reviews = await prisma.review.findMany({
      where: { mopId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Generate MOP steps
    const extractedData = doc.extractedData?.extracted_data || {};
    const steps = generateMOPSteps(extractedData);
    
    // Export based on format
    let exportPath;
    let contentType;
    
    switch (format.toLowerCase()) {
      case 'pdf':
        exportPath = await exportToPDF(mop, steps, reviews);
        contentType = 'application/pdf';
        break;
      case 'docx':
        exportPath = await exportToDOCX(mop, steps, reviews);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'html':
        exportPath = await exportToHTML(mop, steps, reviews);
        contentType = 'text/html';
        break;
      case 'txt':
        exportPath = await exportToText(mop, steps, reviews);
        contentType = 'text/plain';
        break;
      default:
        return res.status(400).json({ message: 'Unsupported export format' });
    }
    
    // Upload to MinIO
    const objectName = `${mop.id}-${Date.now()}.${format.toLowerCase()}`;
    await minioClient.fPutObject(bucketName, objectName, exportPath, { 'Content-Type': contentType });
    
    // Generate presigned URL for download
    const presignedUrl = await minioClient.presignedGetObject(bucketName, objectName, 24 * 60 * 60); // 24 hours expiry
    
    // Delete temporary file
    fs.unlinkSync(exportPath);
    
    // Return download URL
    res.json({
      url: presignedUrl,
      format: format.toLowerCase(),
      filename: `${mop.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format.toLowerCase()}`
    });
  } catch (err) {
    console.error('Error exporting MOP:', err);
    res.status(500).json({ message: 'Error exporting MOP' });
  }
}

/**
 * Export MOP to PDF
 */
async function exportToPDF(mop, steps, reviews) {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      const filePath = path.join(tempDir, `${mop.id}-${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // Title
      doc.fontSize(24).text(mop.title, { align: 'center' });
      doc.moveDown();
      
      // Description
      doc.fontSize(12).text(mop.description);
      doc.moveDown();
      
      // Status and metadata
      doc.fontSize(10)
        .text(`Status: ${mop.status}`)
        .text(`Created: ${new Date(mop.createdAt).toLocaleString()}`)
        .text(`Document ID: ${mop.documentId}`);
      doc.moveDown();
      
      // Steps
      doc.fontSize(16).text('Procedure Steps', { underline: true });
      doc.moveDown();
      
      steps.forEach((step, index) => {
        doc.fontSize(14).text(`Step ${step.stepNumber}: ${step.description}`);
        doc.moveDown(0.5);
        
        doc.fontSize(12).text('Command:');
        doc.fontSize(10).font('Courier').text(step.command, { indent: 20 });
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica').text('Verification:');
        doc.fontSize(10).text(step.verification, { indent: 20 });
        doc.moveDown(0.5);
        
        doc.fontSize(12).text('Rollback:');
        doc.fontSize(10).text(step.rollback, { indent: 20 });
        doc.moveDown();
      });
      
      // Reviews
      if (reviews.length > 0) {
        doc.addPage();
        doc.fontSize(16).text('Reviews', { underline: true });
        doc.moveDown();
        
        reviews.forEach((review, index) => {
          doc.fontSize(12)
            .text(`Review ${index + 1}:`)
            .text(`Status: ${review.status}`)
            .text(`Reviewer: ${review.reviewerId}`)
            .text(`Date: ${new Date(review.createdAt).toLocaleString()}`)
            .text(`Comments: ${review.comments}`);
          doc.moveDown();
        });
      }
      
      // Finalize PDF
      doc.end();
      
      stream.on('finish', () => {
        resolve(filePath);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Export MOP to DOCX
 */
async function exportToDOCX(mop, steps, reviews) {
  try {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const filePath = path.join(tempDir, `${mop.id}-${Date.now()}.docx`);
    
    // Create document
    const doc = new Document({
      title: mop.title,
      description: mop.description,
      styles: {
        paragraphStyles: [
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 28,
              bold: true,
              color: '000000',
            },
            paragraph: {
              spacing: {
                after: 120,
              },
            },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 24,
              bold: true,
              color: '000000',
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
          {
            id: 'StepTitle',
            name: 'Step Title',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 20,
              bold: true,
              color: '000000',
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
        ],
      },
    });
    
    // Title
    doc.addSection({
      children: [
        new Paragraph({
          text: mop.title,
          heading: HeadingLevel.HEADING_1,
          alignment: docx.AlignmentType.CENTER,
        }),
        new Paragraph({
          text: mop.description,
          spacing: {
            after: 200,
          },
        }),
        new Paragraph({
          text: `Status: ${mop.status}`,
        }),
        new Paragraph({
          text: `Created: ${new Date(mop.createdAt).toLocaleString()}`,
        }),
        new Paragraph({
          text: `Document ID: ${mop.documentId}`,
          spacing: {
            after: 200,
          },
        }),
        new Paragraph({
          text: 'Procedure Steps',
          heading: HeadingLevel.HEADING_2,
        }),
      ],
    });
    
    // Steps
    const stepParagraphs = [];
    
    steps.forEach((step) => {
      stepParagraphs.push(
        new Paragraph({
          text: `Step ${step.stepNumber}: ${step.description}`,
          heading: HeadingLevel.HEADING_3,
          spacing: {
            before: 200,
          },
        }),
        new Paragraph({
          text: 'Command:',
          spacing: {
            before: 100,
          },
        }),
        new Paragraph({
          text: step.command,
          style: 'Code',
          spacing: {
            before: 100,
            after: 100,
          },
        }),
        new Paragraph({
          text: 'Verification:',
        }),
        new Paragraph({
          text: step.verification,
          indent: {
            left: 720, // 0.5 inches in twips
          },
          spacing: {
            after: 100,
          },
        }),
        new Paragraph({
          text: 'Rollback:',
        }),
        new Paragraph({
          text: step.rollback,
          indent: {
            left: 720,
          },
          spacing: {
            after: 200,
          },
        })
      );
    });
    
    doc.addSection({
      children: stepParagraphs,
    });
    
    // Reviews
    if (reviews.length > 0) {
      const reviewParagraphs = [
        new Paragraph({
          text: 'Reviews',
          heading: HeadingLevel.HEADING_2,
          pageBreakBefore: true,
        }),
      ];
      
      reviews.forEach((review, index) => {
        reviewParagraphs.push(
          new Paragraph({
            text: `Review ${index + 1}:`,
            spacing: {
              before: 200,
            },
          }),
          new Paragraph({
            text: `Status: ${review.status}`,
          }),
          new Paragraph({
            text: `Reviewer: ${review.reviewerId}`,
          }),
          new Paragraph({
            text: `Date: ${new Date(review.createdAt).toLocaleString()}`,
          }),
          new Paragraph({
            text: `Comments: ${review.comments}`,
            spacing: {
              after: 200,
            },
          })
        );
      });
      
      doc.addSection({
        children: reviewParagraphs,
      });
    }
    
    // Write to file
    const buffer = await docx.Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    
    return filePath;
  } catch (err) {
    console.error('Error exporting to DOCX:', err);
    throw err;
  }
}

/**
 * Export MOP to HTML
 */
async function exportToHTML(mop, steps, reviews) {
  try {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const filePath = path.join(tempDir, `${mop.id}-${Date.now()}.html`);
    
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${mop.title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          h1 {
            text-align: center;
            color: #2c3e50;
          }
          h2 {
            color: #3498db;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          h3 {
            color: #2980b9;
          }
          .metadata {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .step {
            margin-bottom: 30px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
          }
          .command {
            background-color: #2c3e50;
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
          }
          .verification {
            background-color: #f1f8e9;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
          }
          .rollback {
            background-color: #ffebee;
            padding: 10px;
            border-radius: 5px;
          }
          .review {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
          }
          .approved {
            border-left: 5px solid #4caf50;
          }
          .rejected {
            border-left: 5px solid #f44336;
          }
          .pending {
            border-left: 5px solid #ff9800;
          }
        </style>
      </head>
      <body>
        <h1>${mop.title}</h1>
        <p>${mop.description}</p>
        
        <div class="metadata">
          <p><strong>Status:</strong> ${mop.status}</p>
          <p><strong>Created:</strong> ${new Date(mop.createdAt).toLocaleString()}</p>
          <p><strong>Document ID:</strong> ${mop.documentId}</p>
        </div>
        
        <h2>Procedure Steps</h2>
    `;
    
    // Steps
    steps.forEach((step) => {
      html += `
        <div class="step">
          <h3>Step ${step.stepNumber}: ${step.description}</h3>
          <p><strong>Command:</strong></p>
          <div class="command">${step.command}</div>
          <p><strong>Verification:</strong></p>
          <div class="verification">${step.verification}</div>
          <p><strong>Rollback:</strong></p>
          <div class="rollback">${step.rollback}</div>
        </div>
      `;
    });
    
    // Reviews
    if (reviews.length > 0) {
      html += `<h2>Reviews</h2>`;
      
      reviews.forEach((review, index) => {
        html += `
          <div class="review ${review.status}">
            <h3>Review ${index + 1}</h3>
            <p><strong>Status:</strong> ${review.status}</p>
            <p><strong>Reviewer:</strong> ${review.reviewerId}</p>
            <p><strong>Date:</strong> ${new Date(review.createdAt).toLocaleString()}</p>
            <p><strong>Comments:</strong> ${review.comments}</p>
          </div>
        `;
      });
    }
    
    html += `
      </body>
      </html>
    `;
    
    fs.writeFileSync(filePath, html);
    
    return filePath;
  } catch (err) {
    console.error('Error exporting to HTML:', err);
    throw err;
  }
}

/**
 * Export MOP to plain text
 */
async function exportToText(mop, steps, reviews) {
  try {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const filePath = path.join(tempDir, `${mop.id}-${Date.now()}.txt`);
    
    let text = `${mop.title}\n`;
    text += '='.repeat(mop.title.length) + '\n\n';
    
    text += `${mop.description}\n\n`;
    
    text += `Status: ${mop.status}\n`;
    text += `Created: ${new Date(mop.createdAt).toLocaleString()}\n`;
    text += `Document ID: ${mop.documentId}\n\n`;
    
    text += 'PROCEDURE STEPS\n';
    text += '===============\n\n';
    
    // Steps
    steps.forEach((step) => {
      text += `STEP ${step.stepNumber}: ${step.description}\n`;
      text += '-'.repeat(40) + '\n\n';
      
      text += 'Command:\n';
      text += `${step.command}\n\n`;
      
      text += 'Verification:\n';
      text += `${step.verification}\n\n`;
      
      text += 'Rollback:\n';
      text += `${step.rollback}\n\n`;
    });
    
    // Reviews
    if (reviews.length > 0) {
      text += 'REVIEWS\n';
      text += '=======\n\n';
      
      reviews.forEach((review, index) => {
        text += `Review ${index + 1}:\n`;
        text += `Status: ${review.status}\n`;
        text += `Reviewer: ${review.reviewerId}\n`;
        text += `Date: ${new Date(review.createdAt).toLocaleString()}\n`;
        text += `Comments: ${review.comments}\n\n`;
      });
    }
    
    fs.writeFileSync(filePath, text);
    
    return filePath;
  } catch (err) {
    console.error('Error exporting to text:', err);
    throw err;
  }
}

/**
 * Generate MOP steps based on extracted data
 * This is a simplified version of the function in mop.js
 */
function generateMOPSteps(extractedData) {
  const steps = [];
  const { device_type, vendor, model, interfaces, configuration_mode, routing_protocols, vlans } = extractedData;
  
  // Step 1: Connect to device
  steps.push({
    id: 'step1',
    stepNumber: 1,
    description: `Connect to ${vendor || ''} ${model || ''} ${device_type || 'device'}`,
    command: `ssh admin@192.168.1.1\nPassword: ******`,
    verification: 'Verify connection is established and prompt is available',
    rollback: 'Disconnect from device'
  });
  
  // Step 2: Enter privileged mode
  steps.push({
    id: 'step2',
    stepNumber: 2,
    description: 'Enter privileged mode',
    command: vendor && vendor.toLowerCase() === 'cisco' ? 'enable\nPassword: ******' : 'cli\nedit',
    verification: 'Verify prompt changes to indicate privileged mode',
    rollback: 'Exit privileged mode'
  });
  
  // Step 3: Enter configuration mode
  steps.push({
    id: 'step3',
    stepNumber: 3,
    description: 'Enter configuration mode',
    command: vendor && vendor.toLowerCase() === 'cisco' ? 'configure terminal' : 'edit',
    verification: 'Verify prompt changes to indicate configuration mode',
    rollback: 'Exit configuration mode'
  });
  
  // Add more steps based on extracted data
  if (interfaces && interfaces.length > 0) {
    let command = '';
    if (vendor && vendor.toLowerCase() === 'cisco') {
      interfaces.forEach(intf => {
        command += `interface ${intf.name}\n`;
        command += ` ip address ${intf.ip} ${intf.subnet}\n`;
        command += ` no shutdown\n`;
        command += `!\n`;
      });
    } else {
      interfaces.forEach(intf => {
        command += `set interfaces ${intf.name} unit 0 family inet address ${intf.ip}/24\n`;
      });
    }
    
    steps.push({
      id: 'step4',
      stepNumber: 4,
      description: 'Configure interfaces',
      command,
      verification: 'Verify interfaces are configured correctly',
      rollback: 'Shutdown interfaces'
    });
  }
  
  // Save configuration
  steps.push({
    id: `step${steps.length + 1}`,
    stepNumber: steps.length + 1,
    description: 'Save configuration',
    command: vendor && vendor.toLowerCase() === 'cisco' ? 'write memory' : 'commit and-quit',
    verification: 'Verify configuration is saved',
    rollback: 'No rollback needed'
  });
  
  return steps;
}

module.exports = {
  exportMOP
};
