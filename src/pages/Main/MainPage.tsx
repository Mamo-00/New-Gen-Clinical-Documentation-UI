import React from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logoutUser, selectUser } from "../../features/userSlice";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Divider, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import EditorTextArea from "../../components/Editor/EditorTextArea";
import EditorControls from "../../components/Settings/EditorControls";
import DynamicTree from "../../components/Trees/ExampleTree/DynamicTree";
import { initialGlassValues, initialHudbitValues, initialPolyppValues, initialTraadvevValues } from "../../components/Trees/utilities/initialValues";
import { glass, hudbit, traadvev, polypp } from "../../components/Trees/utilities/tree-schema";
// Interface for a single tree item

const MainPage: React.FC = () => {

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    // After logging out, navigate back to the login page
    navigate("/login");
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <Grid container>
        <Grid size={3}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: "100%",
              overflow: "hidden",
              justifyContent: "center",
              my: "auto",
              p: 2,
              pt: 3,
              borderRight: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: "bold", mb: 1 }}>
              B24 00001
            </Typography>
          </Box>
        </Grid>
        <Grid size={9}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              width: "100%",
              overflow: "hidden",
              p: 1,
              pt: 2,
              pb: 0,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <EditorControls />
          </Box>
        </Grid>
        <Grid size={3}>
          <Box
            sx={{
              p: 0,
              pt: 0,
              borderRight: 1,
              borderColor: "divider",
              height: "100%",
            }}
          >
            <Box sx={{ mt: 0, p: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                TXXXXX PXXXXX
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                (Colon Slyngereseksjon)
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Prøvetakingsdato:</span>
                <span>01.02.2024</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Prioritet:</span>
                <Chip label="CITO" size="small" color="error" />
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Glass:</span>
                <span>9</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Blokker:</span>
                <span>10</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Snitt:</span>
                <span>10</span>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                Klinisk opplysning:
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                3 mm polypp. kald slynge. dysplasi?
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                Anatomisk lokalisasjon:
              </Typography>
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                1/1: colon hø. fleksur
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Er prøven tatt i forbindelse med tarmscreeningsprogrammet?: Ja
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid size={5}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: "100%",
              overflow: "hidden",
              mx: "auto",
              p: 2,
              pt: 1,
              borderRight: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="h4" fontWeight={"bold"}>
              Makroskopisk Beskrivelse
            </Typography>
            <EditorTextArea />
            <Typography variant="h4" fontWeight={"bold"}>
              Mikroskopisk Beskrivelse
            </Typography>
            <EditorTextArea />
            <Typography variant="h4" fontWeight={"bold"}>
              Konklusjon/Diagnose
            </Typography>
            <EditorTextArea />
          </Box>
        </Grid>

        <Grid size={4} sx={{p: 2}}>
        <DynamicTree
            title={`Makroskopi - ${traadvev.label}`}
            schema={traadvev}
            initialValues={initialTraadvevValues}
            itemLabel="trådvev"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainPage;
