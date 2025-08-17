const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');
const Society = require('./models/Society');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images, documents, and PDFs
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
    }
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/society-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Login route (simple name-based authentication)
app.post('/api/login', async (req, res) => {
  try {
    const { name, type } = req.body;
    const user = await User.findOne({ name, type });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin routes
app.get('/api/admin/societies', async (req, res) => {
  try {
    const societies = await Society.find();
    res.json(societies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/admin/societies/:id/approve', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }
    society.isApproved = true;
    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/societies/:id/posts', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }
    society.posts = req.body.posts;
    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/admin/societies/:id', async (req, res) => {
  try {
    await Society.findByIdAndDelete(req.params.id);
    res.json({ message: 'Society deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Society routes
app.get('/api/societies/:name', async (req, res) => {
  try {
    const society = await Society.findOne({ name: req.params.name });
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/societies/:name/applications', async (req, res) => {
  try {
    const society = await Society.findOne({ name: req.params.name });
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // Find all students who have applied to this society
    const students = await User.find({
      type: 'Student',
      'applications.societyName': society.name,
      'applications.status': 'requested'
    });

    // Format the applications
    const applications = students.map(student => ({
      studentName: student.name,
      societyName: society.name
    }));

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/societies', async (req, res) => {
  try {
    const society = new Society(req.body);
    await society.save();
    
    // Create corresponding User record for the society
    await User.create({
      name: society.name,
      type: 'Society'
    });
    
    res.status(201).json(society);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create post with file upload
app.post('/api/societies/:id/posts', upload.single('file'), async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const newPost = {
      content: req.body.content,
      isAnnouncement: req.body.isAnnouncement === 'true',
      createdAt: new Date(),
      comments: []
    };

    // If a file was uploaded, add it to the post
    if (req.file) {
      const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      newPost.attachments = [{
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        fileType: req.file.mimetype,
        uploadedAt: new Date()
      }];
    }

    society.posts.push(newPost);
    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/societies/:id/applications/:studentName/approve', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    const studentName = req.params.studentName;
    
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // Add student to members
    if (!society.members.includes(studentName)) {
      society.members.push(studentName);
      
      // Add to member history
      society.memberHistory.push({
        memberName: studentName,
        action: 'joined',
        details: 'Joined the society',
        timestamp: new Date()
      });
    }

    // Update student's application status
    const student = await User.findOne({ name: studentName, type: 'Student' });
    if (student) {
      const application = student.applications.find(app => app.societyName === society.name);
      if (application) {
        application.status = 'accepted';
        await student.save();
      }
    }

    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/societies/:id/applications/:studentName/reject', async (req, res) => {
  try {
    const studentName = req.params.studentName;
    const society = await Society.findById(req.params.id);
    
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // Update student's application status
    const student = await User.findOne({ name: studentName, type: 'Student' });
    if (student) {
      const application = student.applications.find(app => app.societyName === society.name);
      if (application) {
        application.status = 'rejected';
        await student.save();
      }
    }

    res.json({ message: 'Application rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Student routes
app.get('/api/students/:name/applications', async (req, res) => {
  try {
    const student = await User.findOne({ name: req.params.name, type: 'Student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student.applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/students/:name/applications', async (req, res) => {
  try {
    const student = await User.findOne({ name: req.params.name, type: 'Student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const society = await Society.findById(req.body.societyId);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // Check if already applied
    const existingApplication = student.applications.find(
      app => app.societyName === society.name
    );
    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied to this society' });
    }

    // Add new application
    student.applications.push({
      societyName: society.name,
      status: 'requested'
    });
    await student.save();

    res.json(student.applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/students/:name/posts/:societyId/:postIndex/comments', async (req, res) => {
  try {
    const student = await User.findOne({ name: req.params.name, type: 'Student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const society = await Society.findById(req.params.societyId);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // Check if student is a member of the society
    if (!society.members.includes(student.name)) {
      return res.status(403).json({ message: 'You must be a member to comment' });
    }

    const postIndex = parseInt(req.params.postIndex);
    if (postIndex >= society.posts.length) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add the comment
    society.posts[postIndex].comments.push({
      author: student.name,
      content: req.body.content,
      createdAt: new Date()
    });

    await society.save();
    res.json(society.posts[postIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/societies/:id/posts/:postIndex/comments/:commentIndex', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const postIndex = parseInt(req.params.postIndex);
    const commentIndex = parseInt(req.params.commentIndex);

    if (postIndex >= society.posts.length) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (commentIndex >= society.posts[postIndex].comments.length) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Remove the comment
    society.posts[postIndex].comments.splice(commentIndex, 1);
    await society.save();

    res.json(society.posts[postIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/societies/:id/posts/:postIndex', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const postIndex = parseInt(req.params.postIndex);
    if (postIndex >= society.posts.length) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove the post
    society.posts.splice(postIndex, 1);
    await society.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add role to member
app.post('/api/societies/:id/members/:memberName/role', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const { memberName } = req.params;
    const { role } = req.body;

    // Check if member exists
    if (!society.members.includes(memberName)) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check if role is already assigned to another member
    const existingRole = society.memberRoles.find(r => r.role === role);
    if (existingRole && existingRole.memberName !== memberName) {
      return res.status(400).json({ message: 'This role is already assigned to another member' });
    }

    // Remove existing role if any
    const oldRole = society.memberRoles.find(r => r.memberName === memberName);
    if (oldRole) {
      society.memberHistory.push({
        memberName,
        action: 'role_removed',
        details: `Removed from role: ${oldRole.role}`,
        timestamp: new Date()
      });
    }

    society.memberRoles = society.memberRoles.filter(r => r.memberName !== memberName);

    // Add new role
    society.memberRoles.push({ memberName, role });
    
    // Add to member history
    society.memberHistory.push({
      memberName,
      action: 'role_assigned',
      details: `Assigned role: ${role}`,
      timestamp: new Date()
    });

    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove role from member
app.delete('/api/societies/:id/members/:memberName/role', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const { memberName } = req.params;

    // Remove role
    society.memberRoles = society.memberRoles.filter(r => r.memberName !== memberName);
    await society.save();

    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add event to society
app.post('/api/societies/:id/events', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const { name, description, date, startTime, endTime, venue } = req.body;

    // Check if venue exists
    const venueData = society.venues.find(v => v.name === venue);
    if (!venueData) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check for venue conflicts
    const eventDate = new Date(date);
    const hasConflict = venueData.reservations.some(reservation => {
      const reservationDate = new Date(reservation.date);
      return (
        reservationDate.toDateString() === eventDate.toDateString() &&
        reservation.status === 'approved' &&
        (
          (startTime >= reservation.startTime && startTime < reservation.endTime) ||
          (endTime > reservation.startTime && endTime <= reservation.endTime) ||
          (startTime <= reservation.startTime && endTime >= reservation.endTime)
        )
      );
    });

    if (hasConflict) {
      return res.status(400).json({ message: 'Venue is already reserved for this time slot' });
    }

    // Create the event
    const event = {
      name,
      description,
      date: eventDate,
      startTime,
      endTime,
      venue,
      status: 'pending'
    };
    society.events.push(event);

    // Add venue reservation
    venueData.reservations.push({
      eventId: society.events[society.events.length - 1]._id,
      date: eventDate,
      startTime,
      endTime,
      status: 'pending'
    });

    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all pending events (admin)
app.get('/api/admin/events/pending', async (req, res) => {
  try {
    const societies = await Society.find({ 'events.status': 'pending' });
    const pendingEvents = societies.flatMap(society => 
      society.events
        .filter(event => event.status === 'pending')
        .map((event, eventIndex) => ({
          ...event.toObject(),
          societyName: society.name,
          societyId: society._id,
          eventIndex: eventIndex
        }))
    );
    res.json(pendingEvents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/reject event (admin)
app.post('/api/admin/events/:societyId/:eventIndex/:action', async (req, res) => {
  try {
    const society = await Society.findById(req.params.societyId);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const eventIndex = parseInt(req.params.eventIndex);
    const action = req.params.action;

    if (eventIndex >= society.events.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const event = society.events[eventIndex];
    event.status = action === 'approve' ? 'approved' : 'rejected';

    // Update venue reservation status
    const venue = society.venues.find(v => v.name === event.venue);
    if (venue) {
      const reservation = venue.reservations.find(r => 
        r.date.toDateString() === new Date(event.date).toDateString() &&
        r.startTime === event.startTime &&
        r.endTime === event.endTime
      );
      if (reservation) {
        reservation.status = action === 'approve' ? 'approved' : 'rejected';
      }
    }

    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add comment to event
app.post('/api/societies/:id/events/:eventIndex/comments', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const eventIndex = parseInt(req.params.eventIndex);
    if (eventIndex >= society.events.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const { author, content } = req.body;
    society.events[eventIndex].comments.push({
      author,
      content,
      createdAt: new Date()
    });

    await society.save();
    res.json(society.events[eventIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin venue management
app.post('/api/admin/venues', async (req, res) => {
  try {
    const { name, capacity, location } = req.body;
    
    // Add venue to all societies
    const societies = await Society.find();
    for (const society of societies) {
      society.venues.push({
        name,
        capacity,
        location,
        isAvailable: true,
        reservations: []
      });
      await society.save();
    }
    
    res.json({ message: 'Venue added successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/admin/venues/:name', async (req, res) => {
  try {
    const venueName = req.params.name;
    
    // Remove venue from all societies
    const societies = await Society.find();
    for (const society of societies) {
      society.venues = society.venues.filter(v => v.name !== venueName);
      await society.save();
    }
    
    res.json({ message: 'Venue removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all venues (for admin)
app.get('/api/admin/venues', async (req, res) => {
  try {
    const societies = await Society.find();
    const allVenues = new Set();
    const venues = [];
    
    // Collect unique venues from all societies
    societies.forEach(society => {
      society.venues.forEach(venue => {
        if (!allVenues.has(venue.name)) {
          allVenues.add(venue.name);
          venues.push({
            name: venue.name,
            capacity: venue.capacity,
            location: venue.location,
            isAvailable: venue.isAvailable
          });
        }
      });
    });
    
    res.json(venues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all events (admin)
app.get('/api/admin/events/all', async (req, res) => {
  try {
    const societies = await Society.find();
    const allEvents = [];
    
    societies.forEach(society => {
      society.events.forEach((event, index) => {
        allEvents.push({
          societyId: society._id,
          eventIndex: index,
          societyName: society.name,
          name: event.name,
          description: event.description,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          venue: event.venue,
          status: event.status
        });
      });
    });
    
    // Sort events by date (newest first)
    allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(allEvents);
  } catch (error) {
    console.error('Error fetching all events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Schedule announcement
app.post('/api/societies/:id/announcements', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const { content, scheduledFor } = req.body;
    society.posts.push({
      content,
      isAnnouncement: true,
      scheduledFor: new Date(scheduledFor),
      createdAt: new Date(),
      comments: []
    });

    await society.save();
    res.json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get upcoming announcements
app.get('/api/societies/:id/announcements/upcoming', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const now = new Date();
    const upcomingAnnouncements = society.posts.filter(post => 
      post.isAnnouncement && 
      post.scheduledFor && 
      post.scheduledFor > now
    );

    res.json(upcomingAnnouncements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get event reminders for members
app.get('/api/societies/:id/events/reminders', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingEvents = society.events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        event.status === 'approved' &&
        eventDate >= now &&
        eventDate <= tomorrow
      );
    });

    res.json(upcomingEvents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Function to check and post scheduled announcements
const checkScheduledAnnouncements = async () => {
  try {
    const societies = await Society.find();
    const now = new Date();

    for (const society of societies) {
      const postsToUpdate = society.posts.filter(post => 
        post.isAnnouncement && 
        post.scheduledFor && 
        post.scheduledFor <= now &&
        !post.isPosted
      );

      if (postsToUpdate.length > 0) {
        for (const post of postsToUpdate) {
          post.isPosted = true;
        }
        await society.save();
      }
    }
  } catch (error) {
    console.error('Error checking scheduled announcements:', error);
  }
};

// Check for scheduled announcements every minute
setInterval(checkScheduledAnnouncements, 60000);

// Initialize admin user and some dummy data
const initializeData = async () => {
  try {
    // Create admin if not exists
    const adminExists = await User.findOne({ type: 'Admin' });
    if (!adminExists) {
      await User.create({
        name: 'Amir',
        type: 'Admin'
      });
      console.log('Admin user initialized');
    }

    // Define common venues with all required fields
    const commonVenues = [
      {
        name: 'Wisdom Tree',
        capacity: 100,
        location: 'Main Campus',
        isAvailable: true,
        reservations: []
      },
      {
        name: 'CS Lawn',
        capacity: 200,
        location: 'CS Department',
        isAvailable: true,
        reservations: []
      },
      {
        name: 'Med-C',
        capacity: 150,
        location: 'Medical Campus',
        isAvailable: true,
        reservations: []
      },
      {
        name: 'Auditorium',
        capacity: 500,
        location: 'Main Campus',
        isAvailable: true,
        reservations: []
      },
      {
        name: 'Cafeteria',
        capacity: 300,
        location: 'Main Campus',
        isAvailable: true,
        reservations: []
      },
      {
        name: 'Seminar Hall',
        capacity: 80,
        location: 'Engineering Block',
        isAvailable: true,
        reservations: []
      },
      {
        name: 'Sports Complex',
        capacity: 1000,
        location: 'Sports Ground',
        isAvailable: true,
        reservations: []
      },
      {
        name: 'Library',
        capacity: 200,
        location: 'Academic Block',
        isAvailable: true,
        reservations: []
      }
    ];

    // First, ensure all existing societies have the required venue structure
    const societies = await Society.find();
    for (const society of societies) {
      // Ensure category exists
      if (!society.category) {
        society.category = society.name.includes('Computing') ? 'Technical' : 'Literary';
        await society.save();
      }
      
      if (society.venues) {
        // Update existing venues to include reservations if missing
        society.venues = society.venues.map(venue => ({
          ...venue,
          reservations: venue.reservations || []
        }));
        await society.save();
      }
    }

    // Check if Fast Computing Society exists
    let fastComputingSociety = await Society.findOne({ name: 'Fast Computing Society' });
    if (!fastComputingSociety) {
      console.log('Creating Fast Computing Society...');
      const societyData = {
        name: 'Fast Computing Society',
        description: 'A society for computer science enthusiasts',
        category: 'Technical',
        isApproved: true,
        members: ['Hamza', 'Abdullah'],
        memberRoles: [],
        posts: [
          {
            content: 'Welcome to Fast Computing Society!',
            isAnnouncement: true,
            createdAt: new Date(),
            comments: []
          }
        ],
        events: [],
        venues: commonVenues
      };
      console.log('Society data:', societyData);
      fastComputingSociety = await Society.create(societyData);
      console.log('Fast Computing Society created');
    }

    // Check if Fast Literary Society exists
    let fastLiterarySociety = await Society.findOne({ name: 'Fast Literary Society' });
    if (!fastLiterarySociety) {
      console.log('Creating Fast Literary Society...');
      const societyData = {
        name: 'Fast Literary Society',
        description: 'For those who love literature and writing',
        category: 'Literary',
        isApproved: false,
        members: [],
        memberRoles: [],
        posts: [],
        events: [],
        venues: commonVenues
      };
      console.log('Society data:', societyData);
      fastLiterarySociety = await Society.create(societyData);
      console.log('Fast Literary Society created');
    }

    // Add venues to existing societies if they don't have them
    for (const society of societies) {
      if (!society.venues || society.venues.length === 0) {
        society.venues = commonVenues;
        await society.save();
        console.log(`Added venues to ${society.name}`);
      }
    }

    // Check if society users exist, if not create them
    const societyUsers = await User.find({ type: 'Society' });
    if (societyUsers.length === 0) {
      console.log('Creating society users...');
      await User.create([
        {
          name: 'Fast Computing Society',
          type: 'Society'
        },
        {
          name: 'Fast Literary Society',
          type: 'Society'
        }
      ]);
      console.log('Society users created');
    }

    // Create some dummy students if none exist
    const studentsExist = await User.findOne({ type: 'Student' });
    if (!studentsExist) {
      await User.create([
        {
          name: 'Hamza',
          type: 'Student',
          applications: [
            {
              societyName: 'Fast Computing Society',
              status: 'accepted'
            }
          ]
        },
        {
          name: 'Abdullah',
          type: 'Student',
          applications: [
            {
              societyName: 'Fast Computing Society',
              status: 'accepted'
            }
          ]
        },
        {
          name: 'Sarah',
          type: 'Student',
          applications: [
            {
              societyName: 'Fast Computing Society',
              status: 'requested'
            }
          ]
        },
        {
          name: 'Ahmed',
          type: 'Student',
          applications: [
            {
              societyName: 'Fast Literary Society',
              status: 'requested'
            }
          ]
        },
        {
          name: 'Fatima',
          type: 'Student',
          applications: [
            {
              societyName: 'Fast Computing Society',
              status: 'rejected'
            }
          ]
        },
        {
          name: 'Usman',
          type: 'Student',
          applications: []
        },
        {
          name: 'Ayesha',
          type: 'Student',
          applications: []
        },
        {
          name: 'Bilal',
          type: 'Student',
          applications: []
        },
        {
          name: 'Hassan',
          type: 'Student',
          applications: []
        },
        {
          name: 'Mariam',
          type: 'Student',
          applications: []
        },
        {
          name: 'Omar',
          type: 'Student',
          applications: []
        },
        {
          name: 'Zainab',
          type: 'Student',
          applications: []
        },
        {
          name: 'Yusuf',
          type: 'Student',
          applications: []
        },
        {
          name: 'Layla',
          type: 'Student',
          applications: []
        },
        {
          name: 'Ibrahim',
          type: 'Student',
          applications: []
        }
      ]);
      console.log('Dummy students initialized');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

// Edit post
app.put('/api/societies/:id/posts/:postIndex', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const postIndex = parseInt(req.params.postIndex);
    if (postIndex >= society.posts.length) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const { content, editedBy } = req.body;
    society.posts[postIndex].content = content;
    society.posts[postIndex].lastEdited = new Date();
    society.posts[postIndex].editedBy = editedBy;

    await society.save();
    res.json(society.posts[postIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get member history
app.get('/api/societies/:id/members/:memberName/history', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const memberHistory = society.memberHistory.filter(
      history => history.memberName === req.params.memberName
    );

    res.json(memberHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add member history entry
app.post('/api/societies/:id/members/:memberName/history', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const { action, details } = req.body;
    society.memberHistory.push({
      memberName: req.params.memberName,
      action,
      details,
      timestamp: new Date()
    });

    await society.save();
    res.json(society.memberHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Member leaves society
app.post('/api/societies/:id/members/:studentName/leave', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    const studentName = req.params.studentName;
    
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // Remove student from members
    society.members = society.members.filter(member => member !== studentName);
    
    // Add to member history
    society.memberHistory.push({
      memberName: studentName,
      action: 'left',
      details: 'Left the society',
      timestamp: new Date()
    });

    // Remove any roles assigned to the student
    society.memberRoles = society.memberRoles.filter(role => role.memberName !== studentName);

    // Update student's application status
    const student = await User.findOne({ name: studentName, type: 'Student' });
    if (student) {
      // Remove the application entirely
      student.applications = student.applications.filter(app => app.societyName !== society.name);
      await student.save();
    }

    await society.save();
    res.json({ message: 'Successfully left the society' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload file for a post
app.post('/api/societies/:id/posts/:postIndex/attachments', upload.single('file'), async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const postIndex = parseInt(req.params.postIndex);
    if (postIndex >= society.posts.length) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    
    society.posts[postIndex].attachments.push({
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      fileType: req.file.mimetype,
      uploadedAt: new Date()
    });

    await society.save();
    res.json(society.posts[postIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete file attachment
app.delete('/api/societies/:id/posts/:postIndex/attachments/:attachmentIndex', async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const postIndex = parseInt(req.params.postIndex);
    const attachmentIndex = parseInt(req.params.attachmentIndex);

    if (postIndex >= society.posts.length) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const attachment = society.posts[postIndex].attachments[attachmentIndex];
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Delete file from filesystem
    const fileName = attachment.fileUrl.split('/').pop();
    const filePath = path.join(__dirname, 'uploads', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove attachment from post
    society.posts[postIndex].attachments.splice(attachmentIndex, 1);
    await society.save();

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeData();
}); 