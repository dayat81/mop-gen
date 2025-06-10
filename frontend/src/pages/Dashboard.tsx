import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Document {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
}

interface MOP {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [recentMOPs, setRecentMOPs] = useState<MOP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch recent documents
        const documentsResponse = await axios.get('/api/documents?limit=5');
        setRecentDocuments(documentsResponse.data);
        
        // For MVP, we'll simulate MOPs data
        // In a real implementation, you would fetch from the API
        setRecentMOPs([
          {
            id: '1',
            title: 'Router Configuration MOP',
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'Switch Upgrade MOP',
            status: 'in-review',
            createdAt: new Date().toISOString(),
          },
        ]);
        
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CloudUploadIcon />}
                  onClick={() => navigate('/upload')}
                  sx={{ height: '100%' }}
                >
                  Upload Document
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DescriptionIcon />}
                  onClick={() => navigate('/documents')}
                  sx={{ height: '100%' }}
                >
                  View Documents
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Recent Documents */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Documents
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {recentDocuments.length > 0 ? (
              <List>
                {recentDocuments.map((doc) => (
                  <ListItem key={doc.id} button onClick={() => navigate(`/documents/${doc.id}`)}>
                    <ListItemIcon>
                      <DescriptionIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.filename}
                      secondary={`${doc.status} • ${formatDate(doc.createdAt)}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No documents found. Upload a document to get started.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent MOPs */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent MOPs
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {recentMOPs.length > 0 ? (
              <List>
                {recentMOPs.map((mop) => (
                  <ListItem key={mop.id} button onClick={() => navigate(`/mop/${mop.id}`)}>
                    <ListItemIcon>
                      <AssignmentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={mop.title}
                      secondary={`${mop.status} • ${formatDate(mop.createdAt)}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No MOPs found. Generate a MOP from a document to get started.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* System Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="subtitle1">Cognee RAG API</Typography>
                    <Typography variant="body2">Status: Online</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="subtitle1">Database</Typography>
                    <Typography variant="body2">Status: Connected</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="subtitle1">Storage</Typography>
                    <Typography variant="body2">Status: Available</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              <Button size="small" startIcon={<HistoryIcon />}>
                View System Logs
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
