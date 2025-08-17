import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function SocietyDashboard({ user }) {
  const [society, setSociety] = useState(null);
  const [newPost, setNewPost] = useState({ content: '', isAnnouncement: false });
  const [pendingApplications, setPendingApplications] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRoles, setMemberRoles] = useState({});
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: ''
  });
  const [venues, setVenues] = useState([]);
  const [upcomingAnnouncements, setUpcomingAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    content: '',
    scheduledFor: ''
  });
  const [eventReminders, setEventReminders] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [selectedMemberHistory, setSelectedMemberHistory] = useState(null);
  const [selectedApplicantHistory, setSelectedApplicantHistory] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingForPost, setUploadingForPost] = useState(null);

  const fetchSocietyData = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/societies/${user.name}`);
      setSociety(response.data);
    } catch (error) {
      alert('Error fetching society data: ' + error.message);
    }
  }, [user.name]);

  const fetchPendingApplications = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/societies/${user.name}/applications`);
      setPendingApplications(response.data);
    } catch (error) {
      alert('Error fetching applications: ' + error.message);
    }
  }, [user.name]);

  const fetchVenues = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/admin/venues`);
      setVenues(response.data);
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  const fetchUpcomingAnnouncements = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/societies/${society?._id}/announcements/upcoming`);
      setUpcomingAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching upcoming announcements:', error);
    }
  };

  const fetchEventReminders = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/societies/${society?._id}/events/reminders`);
      setEventReminders(response.data);
    } catch (error) {
      console.error('Error fetching event reminders:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSocietyData();
      fetchPendingApplications();
      fetchVenues();
      fetchUpcomingAnnouncements();
      fetchEventReminders();
    }
  }, [user]);

  useEffect(() => {
    if (society) {
      console.log('Society data:', society);
      console.log('Current user:', user);
      console.log('Is user a member:', society.members && society.members.includes(user.name));
    }
  }, [society, user]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('content', newPost.content);
      formData.append('isAnnouncement', newPost.isAnnouncement);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await axios.post(
        `http://localhost:5000/api/societies/${society._id}/posts`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setNewPost({ content: '', isAnnouncement: false });
      setSelectedFile(null);
      fetchSocietyData();
    } catch (error) {
      alert('Error creating post: ' + error.message);
    }
  };

  const handleApplication = async (studentName, action) => {
    try {
      await axios.post(`http://localhost:5000/api/societies/${society._id}/applications/${studentName}/${action}`);
      fetchPendingApplications();
      fetchSocietyData();
    } catch (error) {
      alert(`Error ${action}ing application: ` + error.message);
    }
  };

  const handleDeleteComment = async (postIndex, commentIndex) => {
    try {
      await axios.delete(`http://localhost:5000/api/societies/${society._id}/posts/${postIndex}/comments/${commentIndex}`);
      fetchSocietyData();
    } catch (error) {
      alert('Error deleting comment: ' + error.message);
    }
  };

  const handleDeletePost = async (postIndex) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/societies/${society._id}/posts/${postIndex}`);
      // Refresh society data after deletion
      fetchSocietyData();
    } catch (error) {
      alert('Error deleting post: ' + error.message);
    }
  };

  const handleAssignRole = async (member, role) => {
    try {
      await axios.post(`http://localhost:5000/api/societies/${society._id}/members/${member}/role`, { role });
      // Clear the role for this member after successful assignment
      setMemberRoles(prev => ({ ...prev, [member]: '' }));
      // Refresh society data
      fetchSocietyData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error assigning role');
    }
  };

  const handleRemoveRole = async (memberName) => {
    try {
      await axios.delete(`http://localhost:5000/api/societies/${society._id}/members/${memberName}/role`);
      fetchSocietyData();
    } catch (error) {
      alert('Error removing role: ' + error.message);
    }
  };

  // Function to check if a role is already assigned
  const isRoleAssigned = (role) => {
    return society.memberRoles.some(r => r.role === role);
  };

  // Function to get the member who has a specific role
  const getMemberWithRole = (role) => {
    const roleData = society.memberRoles.find(r => r.role === role);
    return roleData ? roleData.memberName : null;
  };

  // Function to get a member's current role
  const getMemberRole = (memberName) => {
    const roleData = society.memberRoles.find(r => r.memberName === memberName);
    return roleData ? roleData.role : null;
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:5000/api/societies/${society._id}/events`, newEvent);
      setNewEvent({ name: '', description: '', date: '', startTime: '', endTime: '', venue: '' });
      fetchSocietyData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding event');
    }
  };

  const handleScheduleAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:5000/api/societies/${society._id}/announcements`, newAnnouncement);
      setNewAnnouncement({ content: '', scheduledFor: '' });
      fetchUpcomingAnnouncements();
      alert('Announcement scheduled successfully!');
    } catch (error) {
      alert('Error scheduling announcement: ' + error.message);
    }
  };

  const handleEditPost = async (postIndex, newContent) => {
    try {
      await axios.put(`http://localhost:5000/api/societies/${society._id}/posts/${postIndex}`, {
        content: newContent,
        editedBy: user.name
      });
      setEditingPost(null);
      fetchSocietyData();
    } catch (error) {
      alert('Error editing post: ' + error.message);
    }
  };

  const fetchMemberHistory = async (memberName) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/societies/${society._id}/members/${memberName}/history`);
      setSelectedMemberHistory({
        memberName,
        history: response.data
      });
    } catch (error) {
      console.error('Error fetching member history:', error);
    }
  };

  const fetchApplicantHistory = async (studentName) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/societies/${society._id}/members/${studentName}/history`);
      setSelectedApplicantHistory({
        studentName,
        history: response.data
      });
    } catch (error) {
      console.error('Error fetching applicant history:', error);
    }
  };

  const handleLeaveSociety = async () => {
    if (!window.confirm('Are you sure you want to leave this society? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/societies/${society._id}/members/${user.name}/leave`);
      // Redirect to home page or show a message
      window.location.href = '/';
    } catch (error) {
      alert('Error leaving society: ' + error.message);
    }
  };

  const handleFileSelect = (e, postIndex) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setUploadingForPost(postIndex);
    }
  };

  const handleFileUpload = async (postIndex) => {
    if (!selectedFile) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await axios.post(
        `http://localhost:5000/api/societies/${society._id}/posts/${postIndex}/attachments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setSelectedFile(null);
      setUploadingForPost(null);
      fetchSocietyData();
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (postIndex, attachmentIndex) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/api/societies/${society._id}/posts/${postIndex}/attachments/${attachmentIndex}`
      );
      fetchSocietyData();
    } catch (error) {
      alert('Error deleting attachment: ' + error.message);
    }
  };

  if (!society) {
    return <div>Loading...</div>;
  }

  const isMember = society.members && society.members.includes(user.name);
  console.log('Debug info:', {
    user: user,
    society: society,
    isMember: isMember,
    members: society.members
  });

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div>
          <h2>{society.name} Dashboard</h2>
          <p>{society.description}</p>
          <p>Status: {society.isApproved ? 'Approved' : 'Pending Approval'}</p>
        </div>
        {isMember && (
          <button 
            onClick={handleLeaveSociety}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            Leave Society
          </button>
        )}
      </div>

      {/* Event Reminders Section */}
      {eventReminders.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
          <h3>📅 Upcoming Events (Next 24 Hours)</h3>
          {eventReminders.map((event, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <h4>{event.name}</h4>
              <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
              <p><strong>Venue:</strong> {event.venue}</p>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Announcement Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Schedule Announcement</h3>
        <form onSubmit={handleScheduleAnnouncement}>
          <div style={{ marginBottom: '10px' }}>
            <textarea
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              placeholder="Enter announcement content"
              required
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <input
              type="datetime-local"
              value={newAnnouncement.scheduledFor}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scheduledFor: e.target.value })}
              required
              style={{ padding: '8px', marginBottom: '10px' }}
            />
            <button type="submit" style={{ padding: '8px 16px' }}>Schedule Announcement</button>
          </div>
        </form>
      </div>

      {/* Upcoming Announcements Section */}
      {upcomingAnnouncements.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Upcoming Announcements</h3>
          {upcomingAnnouncements.map((announcement, index) => (
            <div key={index} style={{ 
              marginBottom: '10px', 
              padding: '10px', 
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}>
              <p>{announcement.content}</p>
              <small>Scheduled for: {new Date(announcement.scheduledFor).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}

      {/* Pending Applications Section */}
      {pendingApplications.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h3>Pending Applications</h3>
          <div>
            {pendingApplications.map((application, index) => (
              <div key={index} style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                border: '1px solid #eee',
                borderRadius: '4px',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0 }}>{application.studentName}</h4>
                  <button 
                    onClick={() => fetchApplicantHistory(application.studentName)}
                    style={{ 
                      backgroundColor: '#17a2b8', 
                      color: 'white', 
                      border: 'none', 
                      padding: '5px 10px', 
                      borderRadius: '4px', 
                      cursor: 'pointer'
                    }}
                  >
                    View History
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleApplication(application.studentName, 'approve')}
                    style={{ backgroundColor: '#90EE90', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleApplication(application.studentName, 'reject')}
                    style={{ backgroundColor: '#FFB6C1', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applicant History Modal */}
      {selectedApplicantHistory && (
        <div className="modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3>{selectedApplicantHistory.studentName}'s History</h3>
            {selectedApplicantHistory.history.length > 0 ? (
              <div>
                {selectedApplicantHistory.history.map((entry, index) => (
                  <div key={index} style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    marginBottom: '10px'
                  }}>
                    <p><strong>Action:</strong> {entry.action.replace('_', ' ').toUpperCase()}</p>
                    <p><strong>Details:</strong> {entry.details}</p>
                    <small>{new Date(entry.timestamp).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>No history available for this applicant.</p>
            )}
            <button 
              onClick={() => setSelectedApplicantHistory(null)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Post Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Create Post</h3>
        <form onSubmit={handlePostSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Content:</label>
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>
              <input
                type="checkbox"
                checked={newPost.isAnnouncement}
                onChange={(e) => setNewPost({ ...newPost, isAnnouncement: e.target.checked })}
              />
              Is Announcement
            </label>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Attach File:</label>
            <input
              type="file"
              onChange={(e) => handleFileSelect(e, null)}
              style={{ marginBottom: '10px' }}
            />
            {selectedFile && (
              <p style={{ marginBottom: '10px' }}>
                Selected file: {selectedFile.name}
              </p>
            )}
          </div>
          <button 
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Post
          </button>
        </form>
      </div>

      {/* Posts Section */}
      <div className="posts-section">
        <h3>Posts</h3>
        {society.posts && society.posts.length > 0 ? (
          society.posts.map((post, index) => (
            <div key={index} className="post">
              <div className="post-header">
                <h4>{post.isAnnouncement ? '📢 Announcement' : 'Post'}</h4>
                <div>
                  <button 
                    className="edit-button"
                    onClick={() => setEditingPost({ index, content: post.content })}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => handleDeletePost(index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingPost && editingPost.index === index ? (
                <div className="edit-post-form">
                  <textarea
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    style={{ width: '100%', marginBottom: '10px' }}
                  />
                  <div>
                    <button 
                      onClick={() => handleEditPost(index, editingPost.content)}
                      style={{ marginRight: '10px' }}
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingPost(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{post.content}</p>
                  {post.lastEdited && (
                    <small style={{ color: '#666' }}>
                      Last edited by {post.editedBy} on {new Date(post.lastEdited).toLocaleString()}
                    </small>
                  )}
                </>
              )}

              {/* File Attachments */}
              {post.attachments && post.attachments.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <h5>Attachments:</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {post.attachments.map((attachment, attachmentIndex) => (
                      <div 
                        key={attachmentIndex}
                        style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: '#f8f9fa',
                          width: '100%'
                        }}
                      >
                        {attachment.fileType.startsWith('image/') ? (
                          <div>
                            <img 
                              src={attachment.fileUrl} 
                              alt={attachment.fileName}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                marginBottom: '10px',
                                borderRadius: '4px'
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <a 
                                href={attachment.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ marginRight: '10px' }}
                              >
                                {attachment.fileName}
                              </a>
                              <button
                                onClick={() => handleDeleteAttachment(index, attachmentIndex)}
                                style={{
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <a 
                              href={attachment.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ marginRight: '10px' }}
                            >
                              {attachment.fileName}
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(index, attachmentIndex)}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="comments">
                <h5>Comments</h5>
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment, commentIndex) => (
                    <div key={commentIndex} className="comment">
                      <strong>{comment.author}:</strong> {comment.content}
                      <button 
                        className="delete-comment-button"
                        onClick={() => handleDeleteComment(index, commentIndex)}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No comments yet</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>No posts yet</p>
        )}
      </div>

      {/* Members Section with History */}
      <div style={{ marginTop: '30px' }}>
        <h3>Members ({society.members.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {society.members.map((member, index) => {
            const currentRole = getMemberRole(member);
            return (
              <div key={index} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <p><strong>{member}</strong></p>
                {currentRole ? (
                  <div>
                    <p>Role: {currentRole}</p>
                    <button 
                      onClick={() => handleRemoveRole(member)}
                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Remove Role
                    </button>
                  </div>
                ) : (
                  <div>
                    <select 
                      value={memberRoles[member] || ''} 
                      onChange={(e) => setMemberRoles(prev => ({ ...prev, [member]: e.target.value }))}
                      style={{ marginRight: '10px', padding: '5px' }}
                    >
                      <option value="">Select Role</option>
                      {['President', 'Vice President', 'Secretary', 'Treasurer', 'Event Coordinator'].map(role => (
                        <option 
                          key={role} 
                          value={role}
                          disabled={isRoleAssigned(role) && getMemberWithRole(role) !== member}
                        >
                          {role} {isRoleAssigned(role) && getMemberWithRole(role) !== member ? `(Assigned to ${getMemberWithRole(role)})` : ''}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleAssignRole(member, memberRoles[member])}
                      disabled={!memberRoles[member]}
                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Assign Role
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => fetchMemberHistory(member)}
                  style={{ 
                    backgroundColor: '#17a2b8', 
                    color: 'white', 
                    border: 'none', 
                    padding: '5px 10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  View History
                </button>
              </div>
            );
          })}
        </div>

        {/* Member History Modal */}
        {selectedMemberHistory && (
          <div className="modal" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3>{selectedMemberHistory.memberName}'s History</h3>
              <div>
                {selectedMemberHistory.history.map((entry, index) => (
                  <div key={index} style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    marginBottom: '10px'
                  }}>
                    <p><strong>Action:</strong> {entry.action.replace('_', ' ').toUpperCase()}</p>
                    <p><strong>Details:</strong> {entry.details}</p>
                    <small>{new Date(entry.timestamp).toLocaleString()}</small>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setSelectedMemberHistory(null)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Events Section */}
      <div style={{ marginTop: '30px' }}>
        <h3>Events</h3>
        <form onSubmit={handleAddEvent} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Event Name"
              value={newEvent.name}
              onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              required
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <textarea
              placeholder="Event Description"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              required
              style={{ marginRight: '10px', padding: '5px', width: '300px' }}
            />
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              required
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <input
              type="time"
              value={newEvent.startTime}
              onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
              required
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <input
              type="time"
              value={newEvent.endTime}
              onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
              required
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <select
              value={newEvent.venue}
              onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
              required
              style={{ marginRight: '10px', padding: '5px' }}
            >
              <option value="">Select Venue</option>
              {venues.map((venue, index) => (
                <option key={index} value={venue.name}>
                  {venue.name} (Capacity: {venue.capacity})
                </option>
              ))}
            </select>
            <button type="submit">Create Event</button>
          </div>
        </form>
        <div>
          {society.events && society.events.length > 0 ? (
            society.events.map((event, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <h4>{event.name}</h4>
                <p>{event.description}</p>
                <p>Date: {new Date(event.date).toLocaleDateString()}</p>
                <p>Time: {event.startTime} - {event.endTime}</p>
                <p>Venue: {event.venue}</p>
                <p>Status: {event.status}</p>
                <div className="comments">
                  <h5>Comments</h5>
                  {event.comments && event.comments.length > 0 ? (
                    event.comments.map((comment, commentIndex) => (
                      <div key={commentIndex} style={{ marginLeft: '20px', marginBottom: '10px' }}>
                        <p><strong>{comment.author}:</strong> {comment.content}</p>
                        <small>{new Date(comment.createdAt).toLocaleString()}</small>
                      </div>
                    ))
                  ) : (
                    <p>No comments yet</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p>No events yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SocietyDashboard;

<style>
{`
  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .edit-button {
    background: #17a2b8;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 10px;
  }

  .edit-button:hover {
    background: #138496;
  }

  .delete-button {
    background: #dc3545;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  }

  .delete-button:hover {
    background: #c82333;
  }

  .delete-comment-button {
    background: #dc3545;
    color: white;
    border: none;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 10px;
    font-size: 0.8em;
  }

  .delete-comment-button:hover {
    background: #c82333;
  }

  .edit-post-form {
    margin: 10px 0;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
`}
</style> 