import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
} from "@mui/material";

/**
 * Example of a single “Makroskopi” form replicating the layout in your screenshot.
 * You can adapt it for multiple “Glass” items or build a loop/map over an array.
 */
const GlassTree: React.FC = () => {
  const [antallGlass, setAntallGlass] = useState(1);
  const [glass1Value, setGlass1Value] = useState("");
  const [blokker, setBlokker] = useState("#1");

  // Dimension fields
  const [hoyde, setHoyde] = useState(0);
  const [bredde, setBredde] = useState(0);
  const [lengde, setLengde] = useState(0);

  // Appearance fields
  const [utseende, setUtseende] = useState("bredbaset");
  const [orientert, setOrientert] = useState(false);
  const [oppdelt, setOppdelt] = useState(false);
  const [oppdeltNumber, setOppdeltNumber] = useState(0);

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      {/* Top-level heading */}
      <Typography variant="h6">Makroskopi</Typography>

      {/* Antall glass */}
      <Box display="flex" alignItems="center" gap={1}>
        <Typography>Antall glass:</Typography>
        <TextField
          type="number"
          size="small"
          sx={{ width: 60 }}
          value={antallGlass}
          onChange={(e) => setAntallGlass(Number(e.target.value))}
        />
      </Box>

      {/* Glass 1 row */}
      <Box display="flex" alignItems="center" gap={1}>
        <Typography>Glass 1:</Typography>
        <TextField
          size="small"
          sx={{ width: 100 }}
          value={glass1Value}
          onChange={(e) => setGlass1Value(e.target.value)}
        />
        <Typography>Blokker:</Typography>
        <TextField
          size="small"
          sx={{ width: 60 }}
          value={blokker}
          onChange={(e) => setBlokker(e.target.value)}
        />
      </Box>

      {/* Dimensjoner */}
      <Box sx={{ pl: 3 }} display="flex" flexDirection="column" >
        <Typography>Dimensjoner:</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Stack direction="column" pl={2}>
            <Stack direction="row" spacing={2} sx={{mt:1}} alignItems="center">
              <Typography sx={{width: 40}}>høyde:</Typography>
              <TextField
                type="number"
                size="small"
                sx={{ width: 60 }}
                value={hoyde}
                onChange={(e) => setHoyde(Number(e.target.value))}
              />
              <Typography>mm</Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{mt:1}} alignItems="center">
              <Typography sx={{width: 40}}>bredde:</Typography>
              <TextField
                type="number"
                size="small"
                sx={{ width: 60 }}
                value={bredde}
                onChange={(e) => setBredde(Number(e.target.value))}
              />
              <Typography>mm</Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{mt:1}} alignItems="center">
              <Typography sx={{width: 40}}>lengde:</Typography>
              <TextField
                type="number"
                size="small"
                sx={{ width: 60 }}
                value={lengde}
                onChange={(e) => setLengde(Number(e.target.value))}
              />
              <Typography>mm</Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Utseende */}
      <Box sx={{ pl: 1.5 }}>
        <Box display="flex" alignItems="center" gap={1} mt={1} pl={1.5}>
          <Typography>Utseende:</Typography>
          <FormControl size="small">
            <InputLabel id="utseende-label">Utseende</InputLabel>
            <Select
              labelId="utseende-label"
              label="Utseende"
              value={utseende}
              onChange={(e) => setUtseende(e.target.value as string)}
              sx={{ width: 120 }}
            >
              <MenuItem value="bredbaset">bredbaset</MenuItem>
              <MenuItem value="stilket">stilket</MenuItem>
              <MenuItem value="annet">annet</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Checkboxes for orientert / oppdelt */}
        <Box display="flex" flexDirection="column" gap={1} sx={{ ml: 0 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={orientert}
                onChange={(e) => setOrientert(e.target.checked)}
              />
            }
            label="Orientert"
            sx={{ ml: 0 }}
          />

          <Box display="flex" alignItems="center"  paddingLeft={0}>
            <Checkbox
              checked={oppdelt}
              onChange={(e) => setOppdelt(e.target.checked)}
            />
            <Typography sx={{mr: 1}}>Oppdelt:</Typography>
            <TextField
              type="number"
              size="small"
              sx={{ width: 60 }}
              disabled={!oppdelt}
              value={oppdeltNumber}
              onChange={(e) => setOppdeltNumber(Number(e.target.value))}
            />
          </Box>
        </Box>
      </Box>

      {/* You could add more "Glass 2," "Glass 3," etc. by repeating or mapping out an array */}
    </Box>
  );
};

export default GlassTree;
