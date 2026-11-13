import React from 'react';
import { Box, Skeleton, Grid, Container } from '@mui/material';

const ReportSkeleton = () => {
  return (
    <Box sx={{ backgroundColor: '#f1f1f1', minHeight: '100vh', pt: 4, pb: 6 }}>
      <Container maxWidth="xl">
        
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            
            <Skeleton variant="rounded" width={56} height={56} sx={{ borderRadius: '12px' }} />
            <Box>
              {/* App Title & Developer Sub lines */}
              <Skeleton variant="text" width={220} height={32} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width={140} height={20} />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Skeleton variant="rounded" width={100} height={38} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rounded" width={110} height={38} sx={{ borderRadius: '8px' }} />
          </Box>
        </Box>

       
        <Grid container spacing={3}>
          
          <Grid item xs={12} md={8}>
            <Skeleton 
              variant="rounded" 
              height={400} 
              sx={{ 
                borderRadius: '16px', 
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)'
              }} 
            />
          </Grid>

          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Skeleton variant="rounded" height={188} sx={{ borderRadius: '16px' }} />
              <Skeleton variant="rounded" height={188} sx={{ borderRadius: '16px' }} />
            </Box>
          </Grid>
        </Grid>

      </Container>
    </Box>
  );
};

export default ReportSkeleton;