import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ user }) {
  const [societies, setSocieties] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [newSociety, setNewSociety] = useState({ name: '', description: '', category: '' });
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [newVenue, setNewVenue] = useState({
    name: '',
    capacity: '',
    location: ''
  });
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    fetchSocieties();
    fetchPendingEvents();
    fetchVenues();
    fetchAllEvents();
  }, []);

  const fetchSocieties = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/societies');
      setSocieties(response.data);
    } catch (error) {
      alert('Error fetching societies: ' + error.message);
    }
  };

  const fetchPendingEvents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/events/pending');
      setPendingEvents(response.data);
    } catch (error) {
      alert('Error fetching pending events: ' + error.message);
    }
  };

  const fetchVenues = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/venues');
      setVenues(response.data);
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  const fetchAllEvents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/events/all');
      setAllEvents(response.data);
    } catch (error) {
      console.error('Error fetching all events:', error);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/societies/${id}/approve`);
      fetchSocieties();
    } catch (error) {
      alert('Error approving society: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/admin/societies/${id}`);
      fetchSocieties();
      setSelectedSociety(null);
    } catch (error) {
      alert('Error deleting society: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/societies', newSociety);
      setNewSociety({ name: '', description: '', category: '' });
      fetchSocieties();
    } catch (error) {
      alert('Error creating society: ' + error.message);
    }
  };

  const handleViewSociety = async (society) => {
    setSelectedSociety(society);
  };

  const handleDeletePost = async (societyId, postIndex) => {
    try {
      const society = societies.find(s => s._id === societyId);
      if (!society) return;

      const updatedPosts = society.posts.filter((_, index) => index !== postIndex);
      await axios.put(`http://localhost:5000/api/admin/societies/${societyId}/posts`, {
        posts: updatedPosts
      });
      
      fetchSocieties();
      setSelectedSociety(prev => ({
        ...prev,
        posts: updatedPosts
      }));
    } catch (error) {
      alert('Error deleting post: ' + error.message);
    }
  };

  const handleEventAction = async (societyId, eventIndex, action) => {
    try {
      console.log('Handling event action:', { societyId, eventIndex, action });
      const response = await axios.post(`http://localhost:5000/api/admin/events/${societyId}/${eventIndex}/${action}`);
      console.log('Event action response:', response.data);
      
      // Refresh all events data
      await Promise.all([
        fetchPendingEvents(),
        fetchSocieties(),
        fetchAllEvents()
      ]);
      
      // Show success message
      alert(`Event ${action}ed successfully`);
    } catch (error) {
      console.error('Error handling event action:', error);
      alert(`Error ${action}ing event: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleAddVenue = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/venues', newVenue);
      setNewVenue({ name: '', capacity: '', location: '' });
      fetchVenues();
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding venue');
    }
  };

  const handleDeleteVenue = async (venueName) => {
    if (window.confirm('Are you sure you want to delete this venue? This will affect all societies.')) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/venues/${venueName}`);
        fetchVenues();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting venue');
      }
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Left side - Society Management */}
        <div style={{ flex: 1 }}>
          <h3>Add New Society</h3>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Name:</label>
              <input
                type="text"
                value={newSociety.name}
                onChange={(e) => setNewSociety({ ...newSociety, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                value={newSociety.description}
                onChange={(e) => setNewSociety({ ...newSociety, description: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Category:</label>
              <select
                value={newSociety.category}
                onChange={(e) => setNewSociety({ ...newSociety, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                <option value="Technical">Technical</option>
                <option value="Literary">Literary</option>
                <option value="Sports">Sports</option>
                <option value="Cultural">Cultural</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button type="submit">Add Society</button>
          </form>

          {/* Venues Section */}
          <div style={{ marginTop: '30px' }}>
            <h3>Venue Management</h3>
            <form onSubmit={handleAddVenue} style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Venue Name"
                  value={newVenue.name}
                  onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                  required
                  style={{ marginRight: '10px', padding: '5px' }}
                />
                <input
                  type="number"
                  placeholder="Capacity"
                  value={newVenue.capacity}
                  onChange={(e) => setNewVenue({ ...newVenue, capacity: e.target.value })}
                  required
                  style={{ marginRight: '10px', padding: '5px' }}
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={newVenue.location}
                  onChange={(e) => setNewVenue({ ...newVenue, location: e.target.value })}
                  required
                  style={{ marginRight: '10px', padding: '5px' }}
                />
                <button type="submit">Add Venue</button>
              </div>
            </form>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {venues.map((venue, index) => (
                <div key={index} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <h4>{venue.name}</h4>
                  <p>Capacity: {venue.capacity}</p>
                  <p>Location: {venue.location}</p>
                  <p>Status: {venue.isAvailable ? 'Available' : 'Occupied'}</p>
                  <button 
                    onClick={() => handleDeleteVenue(venue.name)}
                    style={{ 
                      backgroundColor: '#ff4444', 
                      color: 'white', 
                      border: 'none', 
                      padding: '5px 10px', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete Venue
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* All Events Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3>All Events</h3>
            {allEvents.length > 0 ? (
              allEvents.map((event, index) => (
                <div key={index} style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  backgroundColor: event.status === 'approved' ? '#e6ffe6' : 
                                 event.status === 'rejected' ? '#ffe6e6' : 
                                 '#fff3e6'
                }}>
                  <h4>{event.name}</h4>
                  <p><strong>Society:</strong> {event.societyName}</p>
                  <p><strong>Description:</strong> {event.description}</p>
                  <p><strong>Date:</strong> {new Date(event.date).toLocaleString()}</p>
                  <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                  <p><strong>Venue:</strong> {event.venue}</p>
                  <p><strong>Status:</strong> 
                    <span style={{
                      color: event.status === 'approved' ? 'green' : 
                             event.status === 'rejected' ? 'red' : 
                             'orange',
                      fontWeight: 'bold',
                      marginLeft: '5px'
                    }}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </p>
                  {event.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        onClick={() => handleEventAction(event.societyId, event.eventIndex, 'approve')}
                        style={{ backgroundColor: '#90EE90', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleEventAction(event.societyId, event.eventIndex, 'reject')}
                        style={{ backgroundColor: '#FFB6C1', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No events found</p>
            )}
          </div>

          <h3>Societies</h3>
          <div>
            {societies.map((society) => (
              <div key={society._id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <h4>{society.name}</h4>
                <p>{society.description}</p>
                <p>Status: {society.isApproved ? 'Approved' : 'Pending Approval'}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {!society.isApproved && (
                    <button 
                      onClick={() => handleApprove(society._id)}
                      style={{ backgroundColor: '#90EE90', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(society._id)}
                    style={{ backgroundColor: '#FFB6C1', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Society Feed */}
        {selectedSociety && (
          <div style={{ flex: 1 }}>
            <h3>{selectedSociety.name} Feed</h3>
            <div>
              {selectedSociety.posts.map((post, index) => (
                <div key={index} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                  <h4>{post.isAnnouncement ? '📢 Announcement' : 'Post'}</h4>
                  <p>{post.content}</p>
                  <p>Posted on: {new Date(post.createdAt).toLocaleString()}</p>
                  <h5>Comments ({post.comments.length})</h5>
                  {post.comments.map((comment, commentIndex) => (
                    <div key={commentIndex} style={{ marginLeft: '20px' }}>
                      <p><strong>{comment.author}:</strong> {comment.content}</p>
                      <small>{new Date(comment.createdAt).toLocaleString()}</small>
                    </div>
                  ))}
                  <button 
                    onClick={() => handleDeletePost(selectedSociety._id, index)}
                    style={{ marginTop: '10px' }}
                  >
                    Delete Post
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard; 