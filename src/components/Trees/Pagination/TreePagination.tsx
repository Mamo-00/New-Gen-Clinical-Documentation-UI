import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Pagination,
  Button,
  Stack,
  Tabs,
  Tab,
  IconButton,
  Chip,
} from "@mui/material";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type PaginationPosition = 'top' | 'bottom' | 'both';

interface TreePaginationProps {
  totalItems: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage?: number;
  displayInfo?: {
    start: number;
    end: number;
    total: number;
  };
  itemLabel?: string;
  position?: PaginationPosition;
}

/**
 * TreePagination component handles pagination UI and logic for tree items
 */
const TreePagination: React.FC<TreePaginationProps> = ({
  totalItems,
  currentPage,
  setCurrentPage,
  itemsPerPage = 1,
  displayInfo,
  itemLabel = "item",
  position = 'both',
}) => {
  // State for pagination view (numeric or tabs)
  const [paginationView, setPaginationView] = useState<"numeric" | "tabs">("numeric");
  
  // Calculate total pages based on total items and items per page
  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  // Page navigation handlers
  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, value: number) => {
      setCurrentPage(value);
    },
    [setCurrentPage]
  );

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setCurrentPage(newValue + 1);
    },
    [setCurrentPage]
  );

  const goToNextItem = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const goToPrevItem = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  const goToFirstItem = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  const goToLastItem = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages, setCurrentPage]);

  // Memoize tab pagination to prevent unnecessary re-renders
  const renderTabPagination = useMemo(() => {
    const tabs = [];
    for (let i = 0; i < totalPages; i++) {
      tabs.push(
        <Tab
          key={i}
          label={`${i * itemsPerPage + 1}-${Math.min(
            (i + 1) * itemsPerPage,
            totalItems
          )}`}
          sx={{ minWidth: "auto", px: 1 }}
        />
      );
    }
    return (
      <Tabs
        value={currentPage - 1}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {tabs}
      </Tabs>
    );
  }, [totalPages, currentPage, handleTabChange, itemsPerPage, totalItems]);

  // If there's only one page or less, don't show pagination
  if (totalPages <= 1) {
    return null;
  }

  // Helper to check if a specific part should be shown
  const shouldShowPart = (part: 'top' | 'bottom') => {
    return position === 'both' || position === part;
  };

  return (
    <>
      {/* Top controls - only if position is 'top' or 'both' */}
      {shouldShowPart('top') && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
            {displayInfo && (
              <Chip
                label={`Viser ${displayInfo.start}-${displayInfo.end} av ${displayInfo.total}`}
                variant="outlined"
              />
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              variant={paginationView === "numeric" ? "contained" : "outlined"}
              onClick={() => setPaginationView("numeric")}
            >
              Sidetall
            </Button>
            <Button
              size="small"
              variant={paginationView === "tabs" ? "contained" : "outlined"}
              onClick={() => setPaginationView("tabs")}
            >
              Faner
            </Button>
          </Stack>

          {/* Pagination controls */}
          {paginationView === "numeric" ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 2, alignItems: "center", justifyContent: "center" }}
            >
              <IconButton
                onClick={goToFirstItem}
                disabled={currentPage === 1}
                size="small"
              >
                <KeyboardDoubleArrowLeftIcon fontSize="small" />
              </IconButton>

              <IconButton
                onClick={goToPrevItem}
                disabled={currentPage === 1}
                size="small"
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>

              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                size="small"
                siblingCount={1}
                boundaryCount={1}
              />

              <IconButton
                onClick={goToNextItem}
                disabled={currentPage === totalPages}
                size="small"
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>

              <IconButton
                onClick={goToLastItem}
                disabled={currentPage === totalPages}
                size="small"
              >
                <KeyboardDoubleArrowRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : (
            renderTabPagination
          )}
        </>
      )}

      {/* Bottom pagination for convenience - only if position is 'bottom' or 'both' */}
      {shouldShowPart('bottom') && (
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 2, alignItems: "center", justifyContent: "center" }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={goToPrevItem}
            disabled={currentPage === 1}
            startIcon={<ChevronLeftIcon fontSize="small" />}
          >
            Forrige
          </Button>

          <Typography variant="body2">
            Side {currentPage} av {totalPages}
          </Typography>

          <Button
            variant="outlined"
            size="small"
            onClick={goToNextItem}
            disabled={currentPage === totalPages}
            endIcon={<ChevronRightIcon fontSize="small" />}
          >
            Neste
          </Button>
        </Stack>
      )}
    </>
  );
};

export default TreePagination; 