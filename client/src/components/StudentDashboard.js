import React, { useState, useEffect } from 'react';
import axios from 'axios';

function StudentDashboard({ user }) {
  const [societies, setSocieties] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [newComment, setNewComment] = useState({});
  const [viewMode, setViewMode] = useState('details'); // 'details' or 'society'

  useEffect(() => {
    fetchSocieties();
    fetchMyApplications();
  }, []);

  const fetchSocieties = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/societies');
      setSocieties(response.data);
    } catch (error) {
      alert('Error fetching societies: ' + error.message);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/students/${user.name}/applications`);
      setApplications(response.data);
    } catch (error) {
      alert('Error fetching applications: ' + error.message);
    }
  };

  const handleApply = async (societyId) => {
    try {
      await axios.post(`http://localhost:5000/api/students/${user.name}/applications`, {
        societyId
      });
      fetchMyApplications();
      alert('Application submitted successfully!');
    } catch (error) {
      alert('Error submitting application: ' + error.message);
    }
  };

  const handleViewDetails = (society) => {
    setSelectedSociety(society);
    setViewMode('details');
  };

  const handleViewSociety = (society) => {
    setSelectedSociety(society);
    setViewMode('society');
  };

  const handleComment = async (societyId, postIndex) => {
    try {
      if (!newComment[postIndex]?.trim()) {
        alert('Please enter a comment');
        return;
      }

      await axios.post(`http://localhost:5000/api/students/${user.name}/posts/${societyId}/${postIndex}/comments`, {
        content: newComment[postIndex]
      });

      // Clear the comment input
      setNewComment(prev => ({ ...prev, [postIndex]: '' }));

      // Refresh the society data to show the new comment
      const response = await axios.get(`http://localhost:5000/api/societies/${selectedSociety.name}`);
      setSelectedSociety(response.data);
    } catch (error) {
      alert('Error posting comment: ' + error.message);
    }
  };

  const getApplicationStatus = (societyName) => {
    const application = applications.find(app => app.societyName === societyName);
    if (!application) return null;
    return application.status;
  };

  const isMember = (societyName) => {
    const application = applications.find(app => app.societyName === societyName);
    return application?.status === 'accepted';
  };

  const hasApplied = (society) => {
    const application = applications.find(app => app.societyName === society.name);
    return application !== undefined;
  };

  const getMemberRole = (society, memberName) => {
    if (!society.memberRoles) return null;
    const roleData = society.memberRoles.find(r => r.memberName === memberName);
    return roleData ? roleData.role : null;
  };

  const handleLeaveSociety = async (societyId) => {
    if (!window.confirm('Are you sure you want to leave this society? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/societies/${societyId}/members/${user.name}/leave`);
      // Update both societies and applications data
      await Promise.all([
        fetchSocieties(),
        fetchMyApplications()
      ]);
      setSelectedSociety(null);
      alert('Successfully left the society');
    } catch (error) {
      alert('Error leaving society: ' + error.message);
    }
  };

  return (
    <div className="dashboard">
      <h1>Welcome, {user.name}!</h1>
      
      <div className="societies-list">
        <h2>Available Societies</h2>
        {societies.map((society) => {
          const applicationStatus = getApplicationStatus(society.name);
          return (
            <div key={society._id} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
              <h4>{society.name}</h4>
              <p>{society.description}</p>
              <p>Status: {society.isApproved ? 'Active' : 'Pending Approval'}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleViewSociety(society)}>View Details</button>
                {!hasApplied(society) && society.isApproved && (
                  <button onClick={() => handleApply(society._id)}>Apply</button>
                )}
                {hasApplied(society) && (
                  <span style={{ 
                    padding: '5px 10px', 
                    backgroundColor: applicationStatus === 'accepted' ? '#90EE90' : 
                                   applicationStatus === 'rejected' ? '#FFB6C1' : '#FFD700',
                    borderRadius: '3px'
                  }}>
                    {applicationStatus === 'requested' ? 'Pending' : 
                     applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSociety && (
        <div className="selected-society">
          <h2>{selectedSociety.name}</h2>
          <div className="view-toggle">
            <button 
              className={viewMode === 'details' ? 'active' : ''} 
              onClick={() => setViewMode('details')}
            >
              Details
            </button>
            <button 
              className={viewMode === 'society' ? 'active' : ''} 
              onClick={() => setViewMode('society')}
            >
              Society
            </button>
          </div>
          
          {viewMode === 'details' ? (
            <div className="society-details">
              <p><strong>Description:</strong> {selectedSociety.description}</p>
              <p><strong>Category:</strong> {selectedSociety.category}</p>
              <p><strong>Members:</strong> {selectedSociety.members.length}</p>
              {isMember(selectedSociety.name) && (
                <div style={{ marginTop: '10px' }}>
                  <p><strong>Your Role:</strong> {getMemberRole(selectedSociety, user.name) || 'Member'}</p>
                  <button 
                    onClick={() => handleLeaveSociety(selectedSociety._id)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '10px'
                    }}
                  >
                    Leave Society
                  </button>
                </div>
              )}
              {!isMember(selectedSociety.name) && !hasApplied(selectedSociety) && (
                <button onClick={() => handleApply(selectedSociety._id)}>Apply to Join</button>
              )}
              {hasApplied(selectedSociety) && (
                <p className="status-badge">{getApplicationStatus(selectedSociety.name)}</p>
              )}
            </div>
          ) : (
            <div className="society-view">
              <h3>Recent Posts</h3>
              {selectedSociety.posts && selectedSociety.posts.length > 0 ? (
                selectedSociety.posts.map((post, index) => (
                  <div key={index} className="post">
                    <h4>{post.title}</h4>
                    <p>{post.content}</p>
                    <div className="comments">
                      <h5>Comments</h5>
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comment, commentIndex) => (
                          <div key={commentIndex} style={{ marginLeft: '20px', marginBottom: '10px' }}>
                            <p><strong>{comment.author}:</strong> {comment.content}</p>
                            <small>{new Date(comment.createdAt).toLocaleString()}</small>
                          </div>
                        ))
                      ) : (
                        <p>No comments yet</p>
                      )}
                      {/* Comment input for members */}
                      {isMember(selectedSociety.name) && (
                        <div style={{ marginTop: '10px', marginLeft: '20px' }}>
                          <textarea
                            value={newComment[index] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [index]: e.target.value }))}
                            placeholder="Write a comment..."
                            style={{ width: '100%', padding: '8px', marginBottom: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                          <button
                            onClick={() => handleComment(selectedSociety._id, index)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Post Comment
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p>No posts yet</p>
              )}
            </div>
          )}
        </div>
      )}

      <style>
        {`
          .dashboard {
            padding: 20px;
          }
          
          .societies-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .society-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .society-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
          }
          
          .selected-society {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .view-toggle {
            margin-bottom: 20px;
          }
          
          .view-toggle button {
            padding: 8px 16px;
            margin-right: 10px;
            border: 1px solid #ccc;
            background: white;
            cursor: pointer;
          }
          
          .view-toggle button.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
          }
          
          .society-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .society-view {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .post {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 4px;
          }
          
          .comments {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
          }
          
          .comment {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          
          .comment-form {
            margin-top: 15px;
            display: flex;
            gap: 10px;
          }
          
          .comment-form input {
            flex: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 15px;
            background: #e9ecef;
            color: #495057;
          }
          
          button {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          button:hover {
            background: #0056b3;
          }
        `}
      </style>
    </div>
  );
}

export default StudentDashboard; 