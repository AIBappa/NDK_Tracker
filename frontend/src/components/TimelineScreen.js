import React, { useState, useEffect, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';

const TimelineScreen = ({ apiService, onNavigate }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(new Set(['food', 'medication', 'behavior', 'exercise', 'water', 'potty', 'school']));
  
  const timelineRef = useRef(null);
  const timelineInstance = useRef(null);

  const categories = [
    { id: 'food', name: 'Food', color: '#ff9800' },
    { id: 'medication', name: 'Medication', color: '#f44336' },
    { id: 'behavior', name: 'Behavior', color: '#9c27b0' },
    { id: 'exercise', name: 'Exercise', color: '#4caf50' },
    { id: 'water', name: 'Water', color: '#2196f3' },
    { id: 'potty', name: 'Potty', color: '#795548' },
    { id: 'school', name: 'School', color: '#607d8b' }
  ];

  useEffect(() => {
    loadTimelineData();
  }, [selectedDateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (timelineData && timelineRef.current) {
      renderTimeline();
    }
  }, [timelineData, selectedCategories]);

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedDateRange) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        startDate = weekStart;
        endDate = now;
        break;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);
        startDate = monthStart;
        endDate = now;
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = customEndDate ? new Date(customEndDate) : now;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const loadTimelineData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { start, end } = getDateRange();
      const data = await apiService.getTimelineData(start, end);
      setTimelineData(data);
    } catch (error) {
      console.error('Failed to load timeline data:', error);
      setError('Failed to load timeline data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimeline = () => {
    if (!timelineData || !timelineRef.current) return;

    // Filter items by selected categories
    const filteredItems = timelineData.items.filter(item => 
      selectedCategories.has(item.category)
    );

    // Create vis.js datasets
    const items = new DataSet(filteredItems.map(item => ({
      id: item.id,
      content: item.content,
      start: new Date(item.start),
      group: item.group,
      className: `timeline-item category-${item.category}`,
      title: `${item.category}: ${item.content}` // Tooltip
    })));

    const groups = new DataSet(
      timelineData.groups
        .filter(group => selectedCategories.has(group.id))
        .map(group => ({
          id: group.id,
          content: group.content,
          className: `timeline-group group-${group.id}`
        }))
    );

    // Timeline options
    const options = {
      width: '100%',
      height: '400px',
      margin: {
        item: 10,
        axis: 5
      },
      orientation: 'top',
      stack: true,
      showCurrentTime: true,
      zoomable: true,
      moveable: true,
      groupOrder: 'content',
      type: 'point',
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap'
      }
    };

    // Destroy existing timeline if it exists
    if (timelineInstance.current) {
      timelineInstance.current.destroy();
    }

    // Create new timeline
    timelineInstance.current = new Timeline(timelineRef.current, items, groups, options);

    // Event listeners
    timelineInstance.current.on('select', (event) => {
      if (event.items.length > 0) {
        const selectedItem = items.get(event.items[0]);
        showItemDetails(selectedItem);
      }
    });
  };

  const showItemDetails = (item) => {
    // Find the original item data
    const originalItem = timelineData.items.find(i => i.id === item.id);
    if (originalItem) {
      alert(`${originalItem.category.toUpperCase()}\n\nContent: ${originalItem.content}\nTime: ${new Date(originalItem.start).toLocaleString()}\nSession: ${originalItem.session_id}`);
    }
  };

  const toggleCategory = (categoryId) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(categories.map(c => c.id)));
  };

  const deselectAllCategories = () => {
    setSelectedCategories(new Set());
  };

  return (
    <div className="timeline-screen">
      {/* Header */}
      <div className="timeline-header">
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('conversation')}
            aria-label="Back to conversation"
          >
            ← Back
          </button>
          <h2>Activity Timeline</h2>
          <button 
            className="btn btn-primary"
            onClick={loadTimelineData}
            disabled={isLoading}
            aria-label="Refresh timeline data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="timeline-controls">
        <div className="card">
          {/* Date Range Selection */}
          <div className="control-group">
            <label>Time Range:</label>
            <div className="date-range-buttons">
              {['today', 'week', 'month', 'custom'].map(range => (
                <button
                  key={range}
                  className={`btn ${selectedDateRange === range ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedDateRange(range)}
                  disabled={isLoading}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            
            {selectedDateRange === 'custom' && (
              <div className="custom-date-inputs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  aria-label="Start date"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  aria-label="End date"
                />
              </div>
            )}
          </div>

          {/* Category Filters */}
          <div className="control-group">
            <label>Categories:</label>
            <div className="category-controls">
              <button 
                className="btn btn-small"
                onClick={selectAllCategories}
                disabled={isLoading}
              >
                All
              </button>
              <button 
                className="btn btn-small"
                onClick={deselectAllCategories}
                disabled={isLoading}
              >
                None
              </button>
            </div>
            
            <div className="category-filters">
              {categories.map(category => (
                <label key={category.id} className="category-filter">
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    disabled={isLoading}
                  />
                  <span 
                    className="category-label"
                    style={{ '--category-color': category.color }}
                  >
                    {category.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="timeline-content">
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadTimelineData}>
              Try Again
            </button>
          </div>
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Loading timeline data...</p>
          </div>
        )}

        {!isLoading && !error && timelineData && (
          <div className="timeline-container">
            <div 
              ref={timelineRef} 
              className="timeline-visualization"
              role="img"
              aria-label="Activity timeline visualization"
            />
            
            {timelineData.items.length === 0 && (
              <div className="no-data-message">
                <p>No data found for the selected time range and categories.</p>
                <p>Try selecting a different date range or ensure you have logged some activities.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend and Summary */}
      {timelineData && timelineData.items.length > 0 && (
        <div className="timeline-summary">
          <div className="card">
            <h3>Summary</h3>
            <div className="summary-stats">
              {categories
                .filter(cat => selectedCategories.has(cat.id))
                .map(category => {
                  const count = timelineData.items.filter(item => 
                    item.category === category.id
                  ).length;
                  
                  return (
                    <div key={category.id} className="summary-item">
                      <span 
                        className="category-dot"
                        style={{ backgroundColor: category.color }}
                      ></span>
                      <span className="category-name">{category.name}</span>
                      <span className="category-count">{count}</span>
                    </div>
                  );
                })}
            </div>
            
            <p className="total-items">
              Total items: {timelineData.items.filter(item => 
                selectedCategories.has(item.category)
              ).length}
            </p>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="timeline-help">
        <details className="help-details">
          <summary>How to use the timeline</summary>
          <div className="help-content">
            <ul>
              <li>Select different time ranges to view data from different periods</li>
              <li>Toggle categories on/off to focus on specific activities</li>
              <li>Click on timeline items to see detailed information</li>
              <li>Use mouse wheel or pinch to zoom in/out</li>
              <li>Drag to pan around the timeline</li>
              <li>The red line shows the current time</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};

export default TimelineScreen;