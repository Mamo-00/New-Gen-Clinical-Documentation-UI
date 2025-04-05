import React from "react";
import { Box, Container, Skeleton } from "@mui/material";
import Grid from "@mui/material/Grid2";

const LoadingSkeleton: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 🔹 Top Navigation Bar */}
        <Skeleton variant="rectangular" width="100%" height={60} />

        <Grid container sx={{ flexGrow: 1 }}>
          {/* 🔹 Left Sidebar */}
          <Grid size={3}>
            <Skeleton variant="rectangular" width="100%" height="100%" />
          </Grid>

          {/* 🔹 Main Content */}
          <Grid size={5} sx={{ p: 2 }}>
            <Skeleton variant="text" width="80%" height={40} />
            <Skeleton variant="rectangular" width="100%" height={250} />
            <Skeleton variant="text" width="60%" height={40} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={250} />
            <Skeleton variant="text" width="60%" height={40} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={250} />
          </Grid>

          {/* 🔹 Right Sidebar */}
          <Grid size={4} sx={{ p: 2 }}>
            <Skeleton variant="rectangular" width="100%" height="100%" />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default LoadingSkeleton;
