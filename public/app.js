// ===== QUERY RESULTS DISPLAY FUNCTIONS =====
let currentQueryResult = null;

// Function to send query to backend and display results
async function sendQueryToBackend(message) {
    try {
        // Show loading state
        document.getElementById('queryStatus').innerHTML = 
            '<i class="fas fa-spinner fa-spin"></i><span>Processing query...</span>';
        
        console.log(`Sending query: ${message}`);
        
        // Send to Flask backend
        const response = await fetch('http://localhost:4000/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chat: message })
        });

        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data);
        
        // Store and display results
        currentQueryResult = {
            query: message,
            response: data,
            timestamp: new Date().toLocaleTimeString()
        };
        
        displayQueryResults(currentQueryResult);
        
    } catch (error) {
        console.error('Error sending query:', error);
        document.getElementById('queryStatus').innerHTML = 
            `<i class="fas fa-exclamation-triangle"></i><span>Error: ${error.message}</span>`;
    }
}

// Function to display results in the query box
function displayQueryResults(result) {
    const queryStatus = document.getElementById('queryStatus');
    const intentSection = document.getElementById('intentSection');
    const intentBadge = document.getElementById('intentBadge');
    const parametersSection = document.getElementById('parametersSection');
    const parametersList = document.getElementById('parametersList');
    const bloombergData = document.getElementById('bloombergData');
    const dataContent = document.getElementById('dataContent');

    // Update status
    queryStatus.innerHTML = `<i class="fas fa-check-circle"></i><span>Query processed: ${result.timestamp}</span>`;

    // Display curl command (simulated)
    intentSection.style.display = 'block';
    intentBadge.textContent = 'API Request';
    intentBadge.className = 'intent-badge stat-intent';

    // Display the query that was sent
    parametersSection.style.display = 'block';
    parametersList.innerHTML = `
        <div class="parameter-item">
            <span class="param-key">User Query:</span>
            <span class="param-value">${result.query}</span>
        </div>
        <div class="parameter-item">
            <span class="param-key">Curl Equivalent:</span>
            <span class="param-value">curl -X POST http://localhost:4000/api -H "Content-Type: application/json" -d '{"chat": "${result.query}"}'</span>
        </div>
    `;

    // Display Bloomberg data
    bloombergData.style.display = 'block';
    dataContent.innerHTML = formatBloombergData(result.response);
}

function formatBloombergData(bloombergData) {
    if (typeof bloombergData === 'string') {
        return `<div class="data-text">${bloombergData}</div>`;
    } else if (Array.isArray(bloombergData)) {
        return bloombergData.map(item => 
            `<div class="data-item">${JSON.stringify(item, null, 2)}</div>`
        ).join('');
    } else if (typeof bloombergData === 'object') {
        return Object.entries(bloombergData).map(([key, value]) => 
            `<div class="data-row">
                <span class="data-key">${formatKey(key)}:</span>
                <span class="data-value">${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</span>
            </div>`
        ).join('');
    }
    return `<div class="data-text">${JSON.stringify(bloombergData, null, 2)}</div>`;
}

function formatKey(key) {
    return key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Add query input functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create and add query input section
    const queryContent = document.getElementById('queryContent');
    
    const queryInputSection = document.createElement('div');
    queryInputSection.className = 'query-input-section';
    queryInputSection.innerHTML = `
        <input type="text" id="userQueryInput" placeholder="Ask anything like: 'What is AAPL price?' or 'Show me TSLA chart'">
        <button id="submitQueryBtn">
            <i class="fas fa-paper-plane"></i>
            Query
        </button>
    `;
    
    queryContent.insertBefore(queryInputSection, queryContent.firstChild);
    
    // Add event listeners
    document.getElementById('submitQueryBtn').addEventListener('click', handleUserQuery);
    document.getElementById('userQueryInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUserQuery();
        }
    });
});

function handleUserQuery() {
    const queryInput = document.getElementById('userQueryInput');
    const query = queryInput.value.trim();
    
    if (!query) return;
    
    // Send query to backend
    sendQueryToBackend(query);
    
    // Clear input
    queryInput.value = '';
}

// ===== SENTIMENT DASHBOARD FUNCTIONS =====
async function updateDashboard() {
    try {
        const response = await fetch('/api/analysis');
        const data = await response.json();
        
        // Update sentiment dashboard elements
        document.getElementById('stockSymbol').textContent = data.stock || 'Waiting for analysis...';
        document.getElementById('sentimentText').textContent = data.sentiment || '-';
        document.getElementById('analysisText').textContent = data.analysis || 'No analysis data available. Send a stock command to your Bloomy bot on Discord.';
        document.getElementById('dataSource').textContent = `Powered by: ${data.method || 'Waiting for data...'}`;
        
        // Update confidence scores
        if (data.confidence) {
            document.getElementById('positivePercent').textContent = `${(data.confidence.positive * 100).toFixed(1)}%`;
            document.getElementById('negativePercent').textContent = `${(data.confidence.negative * 100).toFixed(1)}%`;
            document.getElementById('neutralPercent').textContent = `${(data.confidence.neutral * 100).toFixed(1)}%`;
            
            document.getElementById('positiveBar').style.width = `${(data.confidence.positive * 100).toFixed(1)}%`;
            document.getElementById('negativeBar').style.width = `${(data.confidence.negative * 100).toFixed(1)}%`;
            document.getElementById('neutralBar').style.width = `${(data.confidence.neutral * 100).toFixed(1)}%`;
        }
        
        // Update last update time
        document.getElementById('lastUpdate').textContent = `Last update: ${new Date().toLocaleTimeString()}`;
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Poll for sentiment updates every 5 seconds
setInterval(updateDashboard, 5000);
updateDashboard(); // Initial call

// Also handle Discord/iMessage queries automatically (placeholder for future integration)
async function checkForAutoQueries() {
    try {
        // This would be where you check for new Discord/iMessage queries
        // For now, we'll just keep the manual input
    } catch (error) {
        console.error('Error checking for auto queries:', error);
    }
}

// Poll for automatic queries every 5 seconds
setInterval(checkForAutoQueries, 5000);