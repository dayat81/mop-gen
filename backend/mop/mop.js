const { check, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate a Method of Procedure (MOP) based on document data
 */
async function generateMOP(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { documentId, title, description } = req.body;
  
  try {
    // Get document from database
    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if document processing is complete
    if (doc.status !== 'completed') {
      return res.status(400).json({ 
        message: 'Document processing is not complete',
        status: doc.status
      });
    }

    // Extract data from document
    const extractedData = doc.extractedData?.extracted_data || {};
    
    if (!extractedData || Object.keys(extractedData).length === 0) {
      return res.status(400).json({ message: 'No extracted data available for MOP generation' });
    }

    // Generate MOP based on extracted data
    const mopTitle = title || `${extractedData.vendor || 'Network'} ${extractedData.device_type || 'Device'} Configuration MOP`;
    const mopDescription = description || `Method of Procedure for configuring ${extractedData.vendor || ''} ${extractedData.model || ''} ${extractedData.device_type || 'device'}`;
    
    // Create MOP in database
    const mop = await prisma.mOP.create({
      data: {
        documentId,
        title: mopTitle,
        description: mopDescription,
        status: 'draft',
        createdBy: req.user?.id || 'admin' // Use authenticated user ID if available
      }
    });

    // Generate MOP steps based on device type and vendor
    const steps = generateMOPSteps(extractedData);
    
    // Return MOP with steps
    res.json({ 
      mop: {
        id: mop.id,
        title: mop.title,
        description: mop.description,
        status: mop.status,
        documentId: mop.documentId,
        createdAt: mop.createdAt,
        steps
      }
    });
  } catch (err) {
    console.error('Error generating MOP:', err);
    res.status(500).json({ message: 'Error generating MOP' });
  }
}

/**
 * Generate MOP steps based on extracted data
 */
function generateMOPSteps(extractedData) {
  const steps = [];
  const { device_type, vendor, model, interfaces, configuration_mode, routing_protocols, vlans } = extractedData;
  
  // Step 1: Connect to device
  steps.push({
    id: 'step1',
    stepNumber: 1,
    description: `Connect to ${vendor || ''} ${model || ''} ${device_type || 'device'}`,
    command: generateConnectionCommand(extractedData),
    verification: 'Verify connection is established and prompt is available',
    rollback: 'Disconnect from device'
  });
  
  // Step 2: Enter privileged mode
  steps.push({
    id: 'step2',
    stepNumber: 2,
    description: 'Enter privileged mode',
    command: generatePrivilegedModeCommand(extractedData),
    verification: 'Verify prompt changes to indicate privileged mode',
    rollback: 'Exit privileged mode'
  });
  
  // Step 3: Enter configuration mode
  steps.push({
    id: 'step3',
    stepNumber: 3,
    description: 'Enter configuration mode',
    command: generateConfigModeCommand(extractedData),
    verification: 'Verify prompt changes to indicate configuration mode',
    rollback: 'Exit configuration mode'
  });
  
  // Step 4: Configure interfaces
  if (interfaces && interfaces.length > 0) {
    steps.push({
      id: 'step4',
      stepNumber: 4,
      description: 'Configure interfaces',
      command: generateInterfaceCommands(extractedData),
      verification: 'Verify interfaces are configured correctly',
      rollback: generateInterfaceRollbackCommands(extractedData)
    });
  }
  
  // Step 5: Configure routing protocols
  if (routing_protocols && routing_protocols.length > 0) {
    steps.push({
      id: 'step5',
      stepNumber: 5,
      description: 'Configure routing protocols',
      command: generateRoutingCommands(extractedData),
      verification: 'Verify routing protocols are configured correctly',
      rollback: generateRoutingRollbackCommands(extractedData)
    });
  }
  
  // Step 6: Configure VLANs (for switches)
  if (device_type === 'switch' && vlans && vlans.length > 0) {
    steps.push({
      id: 'step6',
      stepNumber: 6,
      description: 'Configure VLANs',
      command: generateVlanCommands(extractedData),
      verification: 'Verify VLANs are configured correctly',
      rollback: generateVlanRollbackCommands(extractedData)
    });
  }
  
  // Step 7: Save configuration
  steps.push({
    id: `step${steps.length + 1}`,
    stepNumber: steps.length + 1,
    description: 'Save configuration',
    command: generateSaveCommand(extractedData),
    verification: 'Verify configuration is saved',
    rollback: 'No rollback needed'
  });
  
  // Step 8: Verify configuration
  steps.push({
    id: `step${steps.length + 1}`,
    stepNumber: steps.length + 1,
    description: 'Verify configuration',
    command: generateVerificationCommands(extractedData),
    verification: 'Verify all configurations are applied correctly',
    rollback: 'No rollback needed'
  });
  
  return steps;
}

/**
 * Generate connection command based on device type and vendor
 */
function generateConnectionCommand(extractedData) {
  const { device_type, vendor, interfaces } = extractedData;
  let ip = '192.168.1.1'; // Default IP
  
  // Use first interface IP if available
  if (interfaces && interfaces.length > 0 && interfaces[0].ip) {
    ip = interfaces[0].ip;
  }
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    return `ssh admin@${ip}\nPassword: ******`;
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    return `ssh admin@${ip}\nPassword: ******`;
  } else {
    return `ssh admin@${ip}\nPassword: ******`;
  }
}

/**
 * Generate privileged mode command based on device type and vendor
 */
function generatePrivilegedModeCommand(extractedData) {
  const { vendor } = extractedData;
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    return 'enable\nPassword: ******';
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    return 'cli\nedit';
  } else {
    return 'enable\nPassword: ******';
  }
}

/**
 * Generate configuration mode command based on device type and vendor
 */
function generateConfigModeCommand(extractedData) {
  const { vendor } = extractedData;
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    return 'configure terminal';
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    return 'edit';
  } else {
    return 'configure terminal';
  }
}

/**
 * Generate interface configuration commands
 */
function generateInterfaceCommands(extractedData) {
  const { vendor, interfaces } = extractedData;
  let commands = '';
  
  if (!interfaces || interfaces.length === 0) {
    return 'No interfaces to configure';
  }
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    interfaces.forEach(intf => {
      commands += `interface ${intf.name}\n`;
      commands += ` ip address ${intf.ip} ${intf.subnet}\n`;
      commands += ` no shutdown\n`;
      commands += `!\n`;
    });
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    interfaces.forEach(intf => {
      commands += `set interfaces ${intf.name} unit 0 family inet address ${intf.ip}/${getSubnetBits(intf.subnet)}\n`;
    });
  } else {
    interfaces.forEach(intf => {
      commands += `interface ${intf.name}\n`;
      commands += ` ip address ${intf.ip} ${intf.subnet}\n`;
      commands += ` no shutdown\n`;
      commands += `!\n`;
    });
  }
  
  return commands;
}

/**
 * Generate interface rollback commands
 */
function generateInterfaceRollbackCommands(extractedData) {
  const { vendor, interfaces } = extractedData;
  let commands = '';
  
  if (!interfaces || interfaces.length === 0) {
    return 'No interfaces to rollback';
  }
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    interfaces.forEach(intf => {
      commands += `interface ${intf.name}\n`;
      commands += ` shutdown\n`;
      commands += ` no ip address\n`;
      commands += `!\n`;
    });
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    interfaces.forEach(intf => {
      commands += `delete interfaces ${intf.name} unit 0 family inet\n`;
    });
  } else {
    interfaces.forEach(intf => {
      commands += `interface ${intf.name}\n`;
      commands += ` shutdown\n`;
      commands += ` no ip address\n`;
      commands += `!\n`;
    });
  }
  
  return commands;
}

/**
 * Generate routing protocol configuration commands
 */
function generateRoutingCommands(extractedData) {
  const { vendor, routing_protocols } = extractedData;
  let commands = '';
  
  if (!routing_protocols || routing_protocols.length === 0) {
    return 'No routing protocols to configure';
  }
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    if (routing_protocols.includes('ospf')) {
      commands += `router ospf 1\n`;
      commands += ` network 0.0.0.0 255.255.255.255 area 0\n`;
      commands += `!\n`;
    }
    
    if (routing_protocols.includes('bgp')) {
      commands += `router bgp 65000\n`;
      commands += ` bgp router-id 1.1.1.1\n`;
      commands += `!\n`;
    }
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    if (routing_protocols.includes('ospf')) {
      commands += `set protocols ospf area 0.0.0.0 interface all\n`;
    }
    
    if (routing_protocols.includes('bgp')) {
      commands += `set protocols bgp local-as 65000\n`;
      commands += `set routing-options router-id 1.1.1.1\n`;
    }
  } else {
    if (routing_protocols.includes('ospf')) {
      commands += `router ospf 1\n`;
      commands += ` network 0.0.0.0 255.255.255.255 area 0\n`;
      commands += `!\n`;
    }
    
    if (routing_protocols.includes('bgp')) {
      commands += `router bgp 65000\n`;
      commands += ` bgp router-id 1.1.1.1\n`;
      commands += `!\n`;
    }
  }
  
  return commands;
}

/**
 * Generate routing protocol rollback commands
 */
function generateRoutingRollbackCommands(extractedData) {
  const { vendor, routing_protocols } = extractedData;
  let commands = '';
  
  if (!routing_protocols || routing_protocols.length === 0) {
    return 'No routing protocols to rollback';
  }
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    if (routing_protocols.includes('ospf')) {
      commands += `no router ospf 1\n`;
    }
    
    if (routing_protocols.includes('bgp')) {
      commands += `no router bgp 65000\n`;
    }
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    if (routing_protocols.includes('ospf')) {
      commands += `delete protocols ospf\n`;
    }
    
    if (routing_protocols.includes('bgp')) {
      commands += `delete protocols bgp\n`;
      commands += `delete routing-options router-id\n`;
    }
  } else {
    if (routing_protocols.includes('ospf')) {
      commands += `no router ospf 1\n`;
    }
    
    if (routing_protocols.includes('bgp')) {
      commands += `no router bgp 65000\n`;
    }
  }
  
  return commands;
}

/**
 * Generate VLAN configuration commands
 */
function generateVlanCommands(extractedData) {
  const { vendor, vlans } = extractedData;
  let commands = '';
  
  if (!vlans || vlans.length === 0) {
    return 'No VLANs to configure';
  }
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    vlans.forEach(vlan => {
      commands += `vlan ${vlan.id}\n`;
      commands += ` name ${vlan.name}\n`;
      commands += `!\n`;
    });
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    vlans.forEach(vlan => {
      commands += `set vlans ${vlan.name} vlan-id ${vlan.id}\n`;
    });
  } else {
    vlans.forEach(vlan => {
      commands += `vlan ${vlan.id}\n`;
      commands += ` name ${vlan.name}\n`;
      commands += `!\n`;
    });
  }
  
  return commands;
}

/**
 * Generate VLAN rollback commands
 */
function generateVlanRollbackCommands(extractedData) {
  const { vendor, vlans } = extractedData;
  let commands = '';
  
  if (!vlans || vlans.length === 0) {
    return 'No VLANs to rollback';
  }
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    vlans.forEach(vlan => {
      commands += `no vlan ${vlan.id}\n`;
    });
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    vlans.forEach(vlan => {
      commands += `delete vlans ${vlan.name}\n`;
    });
  } else {
    vlans.forEach(vlan => {
      commands += `no vlan ${vlan.id}\n`;
    });
  }
  
  return commands;
}

/**
 * Generate save configuration command
 */
function generateSaveCommand(extractedData) {
  const { vendor } = extractedData;
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    return 'write memory';
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    return 'commit and-quit';
  } else {
    return 'write memory';
  }
}

/**
 * Generate verification commands
 */
function generateVerificationCommands(extractedData) {
  const { vendor, interfaces, routing_protocols, vlans } = extractedData;
  let commands = '';
  
  if (vendor && vendor.toLowerCase() === 'cisco') {
    commands += `show running-config\n`;
    
    if (interfaces && interfaces.length > 0) {
      commands += `show ip interface brief\n`;
    }
    
    if (routing_protocols && routing_protocols.includes('ospf')) {
      commands += `show ip ospf neighbor\n`;
    }
    
    if (routing_protocols && routing_protocols.includes('bgp')) {
      commands += `show ip bgp summary\n`;
    }
    
    if (vlans && vlans.length > 0) {
      commands += `show vlan brief\n`;
    }
  } else if (vendor && vendor.toLowerCase() === 'juniper') {
    commands += `show configuration\n`;
    
    if (interfaces && interfaces.length > 0) {
      commands += `show interfaces terse\n`;
    }
    
    if (routing_protocols && routing_protocols.includes('ospf')) {
      commands += `show ospf neighbor\n`;
    }
    
    if (routing_protocols && routing_protocols.includes('bgp')) {
      commands += `show bgp summary\n`;
    }
    
    if (vlans && vlans.length > 0) {
      commands += `show vlans\n`;
    }
  } else {
    commands += `show running-config\n`;
    
    if (interfaces && interfaces.length > 0) {
      commands += `show ip interface brief\n`;
    }
  }
  
  return commands;
}

/**
 * Convert subnet mask to CIDR bits
 */
function getSubnetBits(subnetMask) {
  if (!subnetMask) return 24; // Default to /24
  
  const parts = subnetMask.split('.');
  if (parts.length !== 4) return 24;
  
  let bits = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i]);
    for (let j = 7; j >= 0; j--) {
      if (octet & (1 << j)) {
        bits++;
      } else {
        return bits;
      }
    }
  }
  
  return bits;
}

/**
 * Get MOP by ID
 */
async function getMOP(req, res) {
  const { id } = req.params;
  
  try {
    const mop = await prisma.mOP.findUnique({
      where: { id }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    // For MVP, we'll generate steps on-the-fly
    // In a real implementation, steps would be stored in the database
    const doc = await prisma.document.findUnique({
      where: { id: mop.documentId }
    });
    
    if (!doc) {
      return res.status(404).json({ message: 'Associated document not found' });
    }
    
    const extractedData = doc.extractedData?.extracted_data || {};
    const steps = generateMOPSteps(extractedData);
    
    res.json({
      mop: {
        ...mop,
        steps
      }
    });
  } catch (err) {
    console.error('Error getting MOP:', err);
    res.status(500).json({ message: 'Error getting MOP' });
  }
}

/**
 * List all MOPs
 */
async function listMOPs(req, res) {
  try {
    const mops = await prisma.mOP.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(mops);
  } catch (err) {
    console.error('Error listing MOPs:', err);
    res.status(500).json({ message: 'Error listing MOPs' });
  }
}

/**
 * Update MOP
 */
async function updateMOP(req, res) {
  const { id } = req.params;
  const { title, description, status } = req.body;
  
  try {
    const mop = await prisma.mOP.findUnique({
      where: { id }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    const updatedMOP = await prisma.mOP.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(status && { status })
      }
    });
    
    res.json(updatedMOP);
  } catch (err) {
    console.error('Error updating MOP:', err);
    res.status(500).json({ message: 'Error updating MOP' });
  }
}

/**
 * Delete MOP
 */
async function deleteMOP(req, res) {
  const { id } = req.params;
  
  try {
    const mop = await prisma.mOP.findUnique({
      where: { id }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    await prisma.mOP.delete({
      where: { id }
    });
    
    res.json({ message: 'MOP deleted successfully' });
  } catch (err) {
    console.error('Error deleting MOP:', err);
    res.status(500).json({ message: 'Error deleting MOP' });
  }
}

module.exports = {
  generateMOP,
  getMOP,
  listMOPs,
  updateMOP,
  deleteMOP
};
