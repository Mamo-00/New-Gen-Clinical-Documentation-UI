import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  TextField, 
  Pagination, 
  Button, 
  Stack,
  Tabs,
  Tab,
  IconButton,
  Chip
} from "@mui/material";
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TreeRenderer } from "../Renderer/TreeRenderer";
import { FieldValue } from "../utilities/treeTypes";
import { TemplateField } from "../interfaces/iTemplateField";
interface TreeItem {
  id: number;
  values: Record<string, FieldValue>;
}

interface DynamicTreeProps {
  title: string;
  schema: TemplateField;
  initialValues: Record<string, FieldValue>;
  itemLabel?: string; // Optional custom label for each item (default: item)
}

const DynamicTree: React.FC<DynamicTreeProps> = ({ 
  title, 
  schema, 
  initialValues,
  itemLabel = "item"
}) => {
  const [count, setCount] = useState<number>(2);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([
    { id: 1, values: { ...initialValues } },
    { id: 2, values: { ...initialValues } },
  ]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(1);
  const [paginationView, setPaginationView] = useState<'numeric' | 'tabs'>('numeric');

  // Calculate total pages
  const totalPages = Math.ceil(treeItems.length / itemsPerPage);

  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = treeItems.slice(indexOfFirstItem, indexOfLastItem);

  // Update the current page when count changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [count, totalPages, currentPage]);

  // Update the count of tree items
  const handleCountChange = (newCount: number) => {
    if (newCount < 1) return;
    
    setCount(newCount);
    
    if (newCount > treeItems.length) {
      // Add new items
      const newItems: TreeItem[] = [...treeItems];
      for (let i = treeItems.length + 1; i <= newCount; i++) {
        newItems.push({
          id: i,
          values: { ...initialValues }
        });
      }
      setTreeItems(newItems);
    } else if (newCount < treeItems.length) {
      // Remove items
      setTreeItems(treeItems.slice(0, newCount));
    }
  };

  // Handle changes to a specific tree item's fields
  const handleFieldChange = (itemIndex: number, fieldId: string, value: FieldValue) => {
    // Calculate the actual index in the full array
    const actualIndex = indexOfFirstItem + itemIndex;
    
    setTreeItems(prevItems => {
      const newItems = [...prevItems];
      newItems[actualIndex] = {
        ...newItems[actualIndex],
        values: {
          ...newItems[actualIndex].values,
          [fieldId]: value
        }
      };
      return newItems;
    });
  };

  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentPage(newValue + 1);
  };

  // Go to next/previous item
  const goToNextItem = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevItem = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Go to first/last item
  const goToFirstItem = () => {
    setCurrentPage(1);
  };

  const goToLastItem = () => {
    setCurrentPage(totalPages);
  };

  // Generate the tabs for pagination
  const renderTabPagination = () => {
    const tabs = [];
    for (let i = 0; i < totalPages; i++) {
      tabs.push(
        <Tab 
          key={i} 
          label={`${i * itemsPerPage + 1}-${Math.min((i + 1) * itemsPerPage, treeItems.length)}`} 
          sx={{ minWidth: 'auto', px: 1 }}
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
  };

  // Capitalize first letter of itemLabel for display
  const capitalizedItemLabel = itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      
      {/* Controls */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
        <TextField
          label={`Antall ${itemLabel}`}
          type="number"
          value={count}
          onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
          inputProps={{ min: 1 }}
          size="small"
          sx={{ width: 120 }}
        />
        
        <Chip 
          label={`Viser ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, treeItems.length)} av ${treeItems.length}`} 
          variant="outlined" 
        />
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button 
          size="small" 
          variant={paginationView === 'numeric' ? 'contained' : 'outlined'} 
          onClick={() => setPaginationView('numeric')}
        >
          Sidetall
        </Button>
        
        <Button 
          size="small" 
          variant={paginationView === 'tabs' ? 'contained' : 'outlined'} 
          onClick={() => setPaginationView('tabs')}
        >
          Faner
        </Button>
      </Stack>
      
      {/* Pagination controls */}
      {paginationView === 'numeric' ? (
        <Stack 
          direction="row" 
          spacing={1} 
          sx={{ mb: 2, alignItems: 'center', justifyContent: 'center' }}
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
        renderTabPagination()
      )}
      
      {/* Render current tree items */}
      {currentItems.map((item, index) => (
        <Box 
          key={item.id} 
          sx={{ 
            mb: 4, 
            border: '2px solid #eee', 
            p: 2,
            pb: 0, 
            borderRadius: 1,
            position: 'relative'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              {`${capitalizedItemLabel} ${item.id}`}
            </Typography>
            <Chip 
              label={`${indexOfFirstItem + index + 1} av ${treeItems.length}`} 
              size="small" 
              variant="outlined" 
            />
          </Box>
          
          <TreeRenderer
            schema={schema}
            values={item.values}
            onChange={(fieldId, value) => handleFieldChange(index, fieldId, value)}
          />
        </Box>
      ))}
      
      {/* Bottom pagination for convenience */}
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ mt: 2, alignItems: 'center', justifyContent: 'center' }}
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
    </Box>
  );
};

export default DynamicTree;