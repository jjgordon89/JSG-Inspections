import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import './Credentials.css';

const Credentials = () => {
  const { currentUser } = useUser();
  const [credentials, setCredentials] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateCredential, setShowCreateCredential] = useState(false);
  const [showRenewCredential, setShowRenewCredential] = useState(false);
  const [showCredentialCheck, setShowCredentialCheck] = useState(false);
  const [filterPerson, setFilterPerson] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, expiring, expired
  const [filterType, setFilterType] = useState('all');
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [credentialCheckResults, setCredentialCheckResults] = useState([]);

  const [newCredential, setNewCredential] = useState({
    personName: '',
    credentialType: '',
    equipmentTypes: '',
    certificationBody: '',
    certificateNumber: '',
    issueDate: '',
    expirationDate: '',
    renewalRequired: true,
    notes: ''
  });

  const [credentialCheck, setCredentialCheck] = useState({
    personName: '',
    workOrderId: '',
    equipmentType: ''
  });

  useEffect(() => {
    loadData();
    checkExpiringCredentials();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [credentialsData, workOrdersData] = await Promise.all([
        window.api.credentials.getAll(),
        window.api.workOrders.getAll()
      ]);

      setCredentials(credentialsData);
      setWorkOrders(workOrdersData);

    } catch (err) {
      console.error('Error loading credentials data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Phase 6: Credential Expiration Notifications
  const checkExpiringCredentials = async () => {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const expiringCredentials = await window.api.credentials.getExpiring(thirtyDaysFromNow.toISOString().split('T')[0]);
      
      const newNotifications = [];
      
      expiringCredentials.forEach(credential => {
        const expirationDate = new Date(credential.expiration_date);
        const daysUntilExpiry = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          newNotifications.push({
            type: 'critical',
            message: `${credential.person_name}'s ${credential.credential_type} credential expired ${Math.abs(daysUntilExpiry)} days ago`,
            credentialId: credential.id,
            personName: credential.person_name,
            credentialType: credential.credential_type,
            expirationDate: credential.expiration_date
          });
        } else if (daysUntilExpiry <= 7) {
          newNotifications.push({
            type: 'warning',
            message: `${credential.person_name}'s ${credential.credential_type} credential expires in ${daysUntilExpiry} days`,
            credentialId: credential.id,
            personName: credential.person_name,
            credentialType: credential.credential_type,
            expirationDate: credential.expiration_date
          });
        } else if (daysUntilExpiry <= 30) {
          newNotifications.push({
            type: 'info',
            message: `${credential.person_name}'s ${credential.credential_type} credential expires in ${daysUntilExpiry} days`,
            credentialId: credential.id,
            personName: credential.person_name,
            credentialType: credential.credential_type,
            expirationDate: credential.expiration_date
          });
        }
      });
      
      setNotifications(newNotifications);
    } catch (err) {
      console.error('Error checking expiring credentials:', err);
    }
  };

  // Phase 6: Link Credentials to Work Assignments
  const handleCredentialCheck = async (e) => {
    e.preventDefault();
    
    try {
      const personCredentials = await window.api.credentials.getByPerson(credentialCheck.personName);
      const workOrder = workOrders.find(wo => wo.id === parseInt(credentialCheck.workOrderId));
      
      const results = [];
      
      // Check if person has required credentials for the work type and equipment
      const requiredCredentials = getRequiredCredentials(workOrder, credentialCheck.equipmentType);
      
      requiredCredentials.forEach(required => {
        const matchingCredential = personCredentials.find(cred => 
          cred.credential_type === required.type &&
          (cred.equipment_types ? JSON.parse(cred.equipment_types).includes(credentialCheck.equipmentType) : true)
        );
        
        if (matchingCredential) {
          const status = getCredentialStatus(matchingCredential);
          results.push({
            required: required.type,
            status: status === 'current' ? 'valid' : status,
            credential: matchingCredential,
            message: status === 'current' ? 
              `✅ Valid ${required.type} credential` : 
              `❌ ${required.type} credential is ${status}`
          });
        } else {
          results.push({
            required: required.type,
            status: 'missing',
            credential: null,
            message: `❌ Missing required ${required.type} credential`
          });
        }
      });
      
      setCredentialCheckResults(results);
      
      // Log audit entry for credential check
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'credential_check',
        entityType: 'work_order',
        entityId: parseInt(credentialCheck.workOrderId),
        oldValues: null,
        newValues: JSON.stringify({
          personName: credentialCheck.personName,
          equipmentType: credentialCheck.equipmentType,
          results: results
        }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });
      
    } catch (err) {
      console.error('Error checking credentials:', err);
      setError(err.message);
    }
  };

  // Phase 6: Get Required Credentials for Work Type and Equipment
  const getRequiredCredentials = (workOrder, equipmentType) => {
    const required = [];
    
    // Base requirements by equipment type
    if (equipmentType.toLowerCase().includes('crane')) {
      required.push({ type: 'Crane Operator' });
      required.push({ type: 'Rigger' });
      required.push({ type: 'Signal Person' });
    }
    
    if (equipmentType.toLowerCase().includes('hoist')) {
      required.push({ type: 'Crane Operator' });
    }
    
    // Additional requirements by work type
    if (workOrder?.work_type === 'corrective' || workOrder?.work_type === 'emergency') {
      required.push({ type: 'Maintenance Technician' });
    }
    
    if (workOrder?.priority === 'critical') {
      required.push({ type: 'Supervisor' });
    }
    
    // Always require inspector for inspection-related work
    if (workOrder?.title?.toLowerCase().includes('inspect') || 
        workOrder?.description?.toLowerCase().includes('inspect')) {
      required.push({ type: 'Inspector' });
    }
    
    return required;
  };

  const handleCreateCredential = async (e) => {
    e.preventDefault();
    
    try {
      const credentialData = {
        ...newCredential,
        equipmentTypes: newCredential.equipmentTypes ? 
          JSON.stringify(newCredential.equipmentTypes.split(',').map(s => s.trim())) : 
          null,
        renewalRequired: newCredential.renewalRequired ? 1 : 0
      };

      const createResult = await window.api.credentials.create(credentialData);
      const createdCredentialId = createResult?.lastID || createResult?.id || 0;

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'credential',
        entityId: createdCredentialId,
        oldValues: null,
        newValues: JSON.stringify(credentialData),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      setShowCreateCredential(false);
      setShowRenewCredential(false);
      resetNewCredential();
      await loadData();
      await checkExpiringCredentials(); // Refresh notifications
    } catch (err) {
      console.error('Error creating credential:', err);
      setError(err.message);
    }
  };

  // Phase 6: Renew Credential
  const handleRenewCredential = async (credential) => {
    try {
      // Calculate new expiration date (typically 1-3 years depending on credential type)
      const issueDate = new Date();
      const expirationDate = new Date(issueDate);
      
      // Set renewal period based on credential type
      if (credential.credential_type === 'Crane Operator' || credential.credential_type === 'Rigger') {
        expirationDate.setFullYear(expirationDate.getFullYear() + 3); // 3 years for NCCCO
      } else if (credential.credential_type === 'Inspector') {
        expirationDate.setFullYear(expirationDate.getFullYear() + 2); // 2 years for inspectors
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 year default
      }

      // Pre-populate form with renewal data
      setNewCredential({
        personName: credential.person_name,
        credentialType: credential.credential_type,
        equipmentTypes: credential.equipment_types ? 
          JSON.parse(credential.equipment_types).join(', ') : '',
        certificationBody: credential.certification_body,
        certificateNumber: '', // New certificate number
        issueDate: issueDate.toISOString().split('T')[0],
        expirationDate: expirationDate.toISOString().split('T')[0],
        renewalRequired: credential.renewal_required,
        notes: `Renewal of credential #${credential.id}`
      });

      setSelectedCredential(credential);
      setShowRenewCredential(true);
    } catch (err) {
      console.error('Error renewing credential:', err);
      setError(err.message);
    }
  };

  const resetNewCredential = () => {
    setNewCredential({
      personName: '',
      credentialType: '',
      equipmentTypes: '',
      certificationBody: '',
      certificateNumber: '',
      issueDate: '',
      expirationDate: '',
      renewalRequired: true,
      notes: ''
    });
    setSelectedCredential(null);
  };

  const resetCredentialCheck = () => {
    setCredentialCheck({
      personName: '',
      workOrderId: '',
      equipmentType: ''
    });
    setCredentialCheckResults([]);
  };

  const getCredentialStatus = (credential) => {
    if (credential.status !== 'active') return credential.status;
    
    if (!credential.expiration_date) return 'no-expiry';
    
    const today = new Date();
    const expiryDate = new Date(credential.expiration_date);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return 'expiring-soon';
    if (diffDays <= 90) return 'expiring-later';
    return 'current';
  };

  const getStatusBadge = (credential) => {
    const status = getCredentialStatus(credential);
    const statusConfig = {
      'expired': { class: 'status-expired', label: 'Expired' },
      'expiring-soon': { class: 'status-expiring-soon', label: 'Expires Soon' },
      'expiring-later': { class: 'status-expiring-later', label: 'Expires in 90 Days' },
      'current': { class: 'status-current', label: 'Current' },
      'suspended': { class: 'status-suspended', label: 'Suspended' },
      'revoked': { class: 'status-revoked', label: 'Revoked' },
      'no-expiry': { class: 'status-no-expiry', label: 'No Expiry' }
    };

    const config = statusConfig[status] || { class: 'status-unknown', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getFilteredCredentials = () => {
    let filtered = credentials;

    if (filterPerson) {
      filtered = filtered.filter(cred => 
        cred.person_name.toLowerCase().includes(filterPerson.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(cred => cred.credential_type === filterType);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'expiring') {
        filtered = filtered.filter(cred => {
          const status = getCredentialStatus(cred);
          return status === 'expiring-soon' || status === 'expiring-later';
        });
      } else {
        filtered = filtered.filter(cred => getCredentialStatus(cred) === filterStatus);
      }
    }

    return filtered.sort((a, b) => {
      // Sort by person name, then by expiration date
      if (a.person_name !== b.person_name) {
        return a.person_name.localeCompare(b.person_name);
      }
      return new Date(a.expiration_date || '9999-12-31') - new Date(b.expiration_date || '9999-12-31');
    });
  };

  const getUniquePersons = () => {
    return [...new Set(credentials.map(cred => cred.person_name))].sort();
  };

  const getUniqueCredentialTypes = () => {
    return [...new Set(credentials.map(cred => cred.credential_type))].sort();
  };

  const credentialTypes = [
    'Crane Operator',
    'Rigger',
    'Signal Person',
    'Inspector',
    'Maintenance Technician',
    'Safety Officer',
    'Supervisor',
    'Other'
  ];

  const certificationBodies = [
    'NCCCO (National Commission for the Certification of Crane Operators)',
    'OSHA (Occupational Safety and Health Administration)',
    'ASME (American Society of Mechanical Engineers)',
    'AWS (American Welding Society)',
    'Company Internal',
    'Other'
  ];

  if (loading) {
    return (
      <div className="credentials">
        <div className="credentials-header">
          <h1>Credentials</h1>
        </div>
        <div className="loading-spinner">Loading credentials data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="credentials">
        <div className="credentials-header">
          <h1>Credentials</h1>
        </div>
        <div className="error-message">
          <p>Error loading credentials: {error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredCredentials = getFilteredCredentials();
  const uniquePersons = getUniquePersons();
  const uniqueTypes = getUniqueCredentialTypes();

  return (
    <div className="credentials">
      <div className="credentials-header">
        <h1>Credentials</h1>
        <div className="header-actions">
          <button 
            className="create-button secondary"
            onClick={() => setShowCredentialCheck(true)}
          >
            🔍 Check Credentials
          </button>
          <button 
            className="create-button"
            onClick={() => setShowCreateCredential(true)}
          >
            + Add Credential
          </button>
        </div>
      </div>

      {/* Phase 6: Credential Expiration Notifications */}
      {notifications.length > 0 && (
        <div className="credential-notifications">
          <h3>🔔 Credential Expiration Alerts</h3>
          {notifications.map((notification, index) => (
            <div key={index} className={`notification ${notification.type}`}>
              <span className="notification-message">{notification.message}</span>
              <button 
                className="notification-action"
                onClick={() => handleRenewCredential({ 
                  id: notification.credentialId,
                  person_name: notification.personName,
                  credential_type: notification.credentialType,
                  expiration_date: notification.expirationDate
                })}
              >
                Renew Credential
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="credentials-summary">
        <div className="summary-card">
          <span className="summary-value">{credentials.length}</span>
          <span className="summary-label">Total Credentials</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-good">
            {credentials.filter(c => getCredentialStatus(c) === 'current').length}
          </span>
          <span className="summary-label">Current</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-warning">
            {credentials.filter(c => {
              const status = getCredentialStatus(c);
              return status === 'expiring-soon' || status === 'expiring-later';
            }).length}
          </span>
          <span className="summary-label">Expiring</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-critical">
            {credentials.filter(c => getCredentialStatus(c) === 'expired').length}
          </span>
          <span className="summary-label">Expired</span>
        </div>
      </div>

      {/* Filters */}
      <div className="credentials-filters">
        <div className="filter-group">
          <label>Person:</label>
          <select
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
          >
            <option value="">All Persons</option>
            {uniquePersons.map(person => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Credential Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="current">Current</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Credentials List */}
      <div className="credentials-list">
        {filteredCredentials.length === 0 ? (
          <div className="empty-state">
            <p>No credentials found matching the current filters.</p>
            <button 
              className="create-button"
              onClick={() => setShowCreateCredential(true)}
            >
              Add First Credential
            </button>
          </div>
        ) : (
          filteredCredentials.map(credential => (
            <div key={credential.id} className="credential-card">
              <div className="credential-header">
                <div className="credential-title">
                  <h3>{credential.person_name}</h3>
                  <span className="credential-type">{credential.credential_type}</span>
                </div>
                <div className="credential-badges">
                  {getStatusBadge(credential)}
                  {credential.renewal_required && (
                    <span className="renewal-badge">Renewal Required</span>
                  )}
                </div>
              </div>

              <div className="credential-details">
                <div className="detail-row">
                  <span className="detail-label">Issue Date:</span>
                  <span className="detail-value">{new Date(credential.issue_date).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Expiration Date:</span>
                  <span className="detail-value">{new Date(credential.expiration_date).toLocaleDateString()}</span>
                </div>
                {credential.certification_body && (
                  <div className="detail-row">
                    <span className="detail-label">Certification Body:</span>
                    <span className="detail-value">{credential.certification_body}</span>
                  </div>
                )}
                {credential.certificate_number && (
                  <div className="detail-row">
                    <span className="detail-label">Certificate Number:</span>
                    <span className="detail-value">{credential.certificate_number}</span>
                  </div>
                )}
                {credential.equipment_types && (
                  <div className="detail-row">
                    <span className="detail-label">Equipment Types:</span>
                    <span className="detail-value">
                      {JSON.parse(credential.equipment_types).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {credential.notes && (
                <div className="credential-notes">
                  <h4>📝 Notes:</h4>
                  <p>{credential.notes}</p>
                </div>
              )}

              <div className="credential-actions">
                <button className="action-button view-certificate">
                  View Certificate
                </button>
                <button 
                  className="action-button renew"
                  onClick={() => handleRenewCredential(credential)}
                >
                  Renew Credential
                </button>
                <button className="action-button edit">
                  Edit
                </button>
                {credential.status === 'active' && (
                  <button className="action-button suspend">
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Phase 6: Credential Check Modal */}
      {showCredentialCheck && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Check Work Assignment Credentials</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowCredentialCheck(false);
                  resetCredentialCheck();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCredentialCheck} className="create-form">
              <div className="form-group">
                <label>Person Name *</label>
                <select
                  value={credentialCheck.personName}
                  onChange={(e) => setCredentialCheck({...credentialCheck, personName: e.target.value})}
                  required
                >
                  <option value="">Select Person</option>
                  {uniquePersons.map(person => (
                    <option key={person} value={person}>{person}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Work Order *</label>
                <select
                  value={credentialCheck.workOrderId}
                  onChange={(e) => setCredentialCheck({...credentialCheck, workOrderId: e.target.value})}
                  required
                >
                  <option value="">Select Work Order</option>
                  {workOrders.filter(wo => wo.status !== 'closed').map(wo => (
                    <option key={wo.id} value={wo.id}>
                      {wo.wo_number} - {wo.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Equipment Type *</label>
                <input
                  type="text"
                  value={credentialCheck.equipmentType}
                  onChange={(e) => setCredentialCheck({...credentialCheck, equipmentType: e.target.value})}
                  required
                  placeholder="e.g., Overhead Crane, Mobile Crane"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCredentialCheck(false);
                    resetCredentialCheck();
                  }} 
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Check Credentials
                </button>
              </div>
            </form>

            {/* Credential Check Results */}
            {credentialCheckResults.length > 0 && (
              <div className="credential-check-results">
                <h3>Credential Check Results</h3>
                {credentialCheckResults.map((result, index) => (
                  <div key={index} className={`check-result ${result.status}`}>
                    <span className="result-message">{result.message}</span>
                    {result.credential && (
                      <div className="result-details">
                        <small>
                          Expires: {new Date(result.credential.expiration_date).toLocaleDateString()}
                          {result.credential.certificate_number && 
                            ` | Cert: ${result.credential.certificate_number}`
                          }
                        </small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Renew Credential Modal */}
      {(showCreateCredential || showRenewCredential) && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>{showRenewCredential ? 'Renew Credential' : 'Add Credential'}</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowCreateCredential(false);
                  setShowRenewCredential(false);
                  resetNewCredential();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCredential} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Person Name *</label>
                  <input
                    type="text"
                    value={newCredential.personName}
                    onChange={(e) => setNewCredential({...newCredential, personName: e.target.value})}
                    required
                    placeholder="Full name of credential holder"
                    disabled={showRenewCredential}
                  />
                </div>

                <div className="form-group">
                  <label>Credential Type *</label>
                  <select
                    value={newCredential.credentialType}
                    onChange={(e) => setNewCredential({...newCredential, credentialType: e.target.value})}
                    required
                    disabled={showRenewCredential}
                  >
                    <option value="">Select Credential Type</option>
                    {credentialTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Equipment Types (comma-separated)</label>
                <input
                  type="text"
                  value={newCredential.equipmentTypes}
                  onChange={(e) => setNewCredential({...newCredential, equipmentTypes: e.target.value})}
                  placeholder="e.g., Overhead Crane, Mobile Crane, Hoist"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Certification Body *</label>
                  <select
                    value={newCredential.certificationBody}
                    onChange={(e) => setNewCredential({...newCredential, certificationBody: e.target.value})}
                    required
                  >
                    <option value="">Select Certification Body</option>
                    {certificationBodies.map(body => (
                      <option key={body} value={body}>{body}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Certificate Number</label>
                  <input
                    type="text"
                    value={newCredential.certificateNumber}
                    onChange={(e) => setNewCredential({...newCredential, certificateNumber: e.target.value})}
                    placeholder="Certificate or license number"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Issue Date *</label>
                  <input
                    type="date"
                    value={newCredential.issueDate}
                    onChange={(e) => setNewCredential({...newCredential, issueDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Expiration Date *</label>
                  <input
                    type="date"
                    value={newCredential.expirationDate}
                    onChange={(e) => setNewCredential({...newCredential, expirationDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newCredential.renewalRequired}
                    onChange={(e) => setNewCredential({...newCredential, renewalRequired: e.target.checked})}
                  />
                  Renewal Required
                </label>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newCredential.notes}
                  onChange={(e) => setNewCredential({...newCredential, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes about the credential"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateCredential(false);
                    setShowRenewCredential(false);
                    resetNewCredential();
                  }} 
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {showRenewCredential ? 'Renew Credential' : 'Add Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Credentials;
