import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For MVP, we'll simulate user data
      // In a real implementation, you would fetch from the API
      const mockUsers: User[] = [
        {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          username: 'engineer1',
          email: 'engineer1@example.com',
          role: 'engineer',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          username: 'viewer1',
          email: 'viewer1@example.com',
          role: 'viewer',
          createdAt: new Date().toISOString(),
        },
      ];
      
      setUsers(mockUsers);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      // In a real implementation, you would call the API
      // await axios.delete(`/api/users/${userToDelete}`);
      
      setUsers(users.filter((user) => user.id !== userToDelete));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleEditClick = (user: User) => {
    setEditedUser({ ...user });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editedUser) return;

    try {
      // In a real implementation, you would call the API
      // await axios.put(`/api/users/${editedUser.id}`, editedUser);
      
      setUsers(users.map((user) => (user.id === editedUser.id ? editedUser : user)));
      setEditDialogOpen(false);
      setEditedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setEditedUser(null);
  };

  const handleCreateClick = () => {
    setNewUser({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
    });
    setValidationErrors({});
    setCreateDialogOpen(true);
  };

  const validateNewUser = () => {
    const errors: Record<string, string> = {};
    
    if (!newUser.username) {
      errors.username = 'Username is required';
    }
    
    if (!newUser.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(newUser.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!newUser.password) {
      errors.password = 'Password is required';
    } else if (newUser.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSave = async () => {
    if (!validateNewUser()) return;

    try {
      // In a real implementation, you would call the API
      // const response = await axios.post('/api/users', newUser);
      
      // For MVP, we'll simulate a new user
      const newUserWithId: User = {
        id: `new-${Date.now()}`,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: new Date().toISOString(),
      };
      
      setUsers([...users, newUserWithId]);
      setCreateDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  const handleCreateCancel = () => {
    setCreateDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleChip = (role: string) => {
    let color:
      | 'default'
      | 'primary'
      | 'secondary'
      | 'error'
      | 'info'
      | 'success'
      | 'warning'
      | undefined;
    
    switch (role) {
      case 'admin':
        color = 'error';
        break;
      case 'engineer':
        color = 'primary';
        break;
      case 'viewer':
        color = 'success';
        break;
      default:
        color = 'default';
    }

    return <Chip label={role} color={color} size="small" />;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleChip(user.role)}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit User">
                      <IconButton
                        color="primary"
                        onClick={() => handleEditClick(user)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(user.id)}
                        size="small"
                        disabled={user.role === 'admin'} // Prevent deleting admin users
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditCancel}
        aria-labelledby="edit-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="edit-dialog-title">Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={editedUser?.username || ''}
                onChange={(e) =>
                  setEditedUser(editedUser ? { ...editedUser, username: e.target.value } : null)
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editedUser?.email || ''}
                onChange={(e) =>
                  setEditedUser(editedUser ? { ...editedUser, email: e.target.value } : null)
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="edit-role-label">Role</InputLabel>
                <Select
                  labelId="edit-role-label"
                  value={editedUser?.role || ''}
                  label="Role"
                  onChange={(e) =>
                    setEditedUser(editedUser ? { ...editedUser, role: e.target.value } : null)
                  }
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="engineer">Engineer</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button onClick={handleEditSave} color="primary" startIcon={<CheckIcon />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateCancel}
        aria-labelledby="create-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="create-dialog-title">Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                error={!!validationErrors.username}
                helperText={validationErrors.username}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                error={!!validationErrors.password}
                helperText={validationErrors.password}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                error={!!validationErrors.confirmPassword}
                helperText={validationErrors.confirmPassword}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="create-role-label">Role</InputLabel>
                <Select
                  labelId="create-role-label"
                  value={newUser.role}
                  label="Role"
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="engineer">Engineer</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateCancel} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button onClick={handleCreateSave} color="primary" startIcon={<CheckIcon />}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
