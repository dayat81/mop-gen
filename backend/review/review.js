const { check, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Create a review for a MOP
 */
async function createReview(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { mopId, comments, status } = req.body;
  
  try {
    // Check if MOP exists
    const mop = await prisma.mOP.findUnique({
      where: { id: mopId }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    // Create review
    const review = await prisma.review.create({
      data: {
        mopId,
        reviewerId: req.user?.id || 'admin', // Use authenticated user ID if available
        status: status || 'pending',
        comments: comments || ''
      }
    });
    
    // Update MOP status if review status is 'approved' or 'rejected'
    if (status === 'approved' || status === 'rejected') {
      await prisma.mOP.update({
        where: { id: mopId },
        data: { status: status === 'approved' ? 'approved' : 'rejected' }
      });
    }
    
    res.status(201).json(review);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ message: 'Error creating review' });
  }
}

/**
 * Get a review by ID
 */
async function getReview(req, res) {
  const { id } = req.params;
  
  try {
    const review = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json(review);
  } catch (err) {
    console.error('Error getting review:', err);
    res.status(500).json({ message: 'Error getting review' });
  }
}

/**
 * List all reviews for a MOP
 */
async function listReviews(req, res) {
  const { mopId } = req.params;
  
  try {
    // Check if MOP exists
    const mop = await prisma.mOP.findUnique({
      where: { id: mopId }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    // Get reviews
    const reviews = await prisma.review.findMany({
      where: { mopId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(reviews);
  } catch (err) {
    console.error('Error listing reviews:', err);
    res.status(500).json({ message: 'Error listing reviews' });
  }
}

/**
 * Update a review
 */
async function updateReview(req, res) {
  const { id } = req.params;
  const { comments, status } = req.body;
  
  try {
    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        ...(comments !== undefined && { comments }),
        ...(status !== undefined && { status })
      }
    });
    
    // Update MOP status if review status is 'approved' or 'rejected'
    if (status === 'approved' || status === 'rejected') {
      await prisma.mOP.update({
        where: { id: review.mopId },
        data: { status: status === 'approved' ? 'approved' : 'rejected' }
      });
    }
    
    res.json(updatedReview);
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ message: 'Error updating review' });
  }
}

/**
 * Delete a review
 */
async function deleteReview(req, res) {
  const { id } = req.params;
  
  try {
    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Delete review
    await prisma.review.delete({
      where: { id }
    });
    
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ message: 'Error deleting review' });
  }
}

/**
 * Approve a MOP
 */
async function approveMOP(req, res) {
  const { id } = req.params;
  const { comments } = req.body;
  
  try {
    // Check if MOP exists
    const mop = await prisma.mOP.findUnique({
      where: { id }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    // Create approval review
    const review = await prisma.review.create({
      data: {
        mopId: id,
        reviewerId: req.user?.id || 'admin', // Use authenticated user ID if available
        status: 'approved',
        comments: comments || 'Approved'
      }
    });
    
    // Update MOP status
    const updatedMOP = await prisma.mOP.update({
      where: { id },
      data: { status: 'approved' }
    });
    
    res.json({
      message: 'MOP approved successfully',
      mop: updatedMOP,
      review
    });
  } catch (err) {
    console.error('Error approving MOP:', err);
    res.status(500).json({ message: 'Error approving MOP' });
  }
}

/**
 * Reject a MOP
 */
async function rejectMOP(req, res) {
  const { id } = req.params;
  const { comments } = req.body;
  
  try {
    // Check if MOP exists
    const mop = await prisma.mOP.findUnique({
      where: { id }
    });
    
    if (!mop) {
      return res.status(404).json({ message: 'MOP not found' });
    }
    
    // Create rejection review
    const review = await prisma.review.create({
      data: {
        mopId: id,
        reviewerId: req.user?.id || 'admin', // Use authenticated user ID if available
        status: 'rejected',
        comments: comments || 'Rejected'
      }
    });
    
    // Update MOP status
    const updatedMOP = await prisma.mOP.update({
      where: { id },
      data: { status: 'rejected' }
    });
    
    res.json({
      message: 'MOP rejected successfully',
      mop: updatedMOP,
      review
    });
  } catch (err) {
    console.error('Error rejecting MOP:', err);
    res.status(500).json({ message: 'Error rejecting MOP' });
  }
}

/**
 * Get pending reviews for current user
 */
async function getPendingReviews(req, res) {
  try {
    // In a real implementation, we would filter by the current user's ID
    // For MVP, we'll return all pending reviews
    const pendingReviews = await prisma.review.findMany({
      where: { status: 'pending' },
      include: {
        mop: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(pendingReviews);
  } catch (err) {
    console.error('Error getting pending reviews:', err);
    res.status(500).json({ message: 'Error getting pending reviews' });
  }
}

module.exports = {
  createReview,
  getReview,
  listReviews,
  updateReview,
  deleteReview,
  approveMOP,
  rejectMOP,
  getPendingReviews
};
