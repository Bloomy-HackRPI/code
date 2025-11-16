class StockDashboard {
    constructor() {
        this.currentData = null;
        this.init();
    }

    init() {
        this.updateDashboard();
        // Poll for updates every 2 seconds
        setInterval(() => this.updateDashboard(), 2000);
        
        // Add some visual flair
        this.addVisualEffects();
    }

    async updateDashboard() {
        try {
            const response = await fetch('/api/analysis');
            const data = await response.json();
            
            if (data.stock && data !== this.currentData) {
                this.currentData = data;
                this.render(data);
                this.animateChanges();
            }
        } catch (error) {
            console.log('Failed to fetch analysis data:', error);
        }
    }

    render(data) {
        // Update stock symbol
        document.getElementById('stockSymbol').textContent = data.stock || 'Waiting for analysis...';
        
        // Update sentiment badge
        const sentimentBadge = document.getElementById('sentimentBadge');
        const sentimentText = document.getElementById('sentimentText');
        sentimentText.textContent = data.sentiment || '-';
        
        // Set sentiment class
        sentimentBadge.className = 'sentiment-badge';
        if (data.sentiment) {
            const sentimentClass = data.sentiment.toLowerCase().replace(' ', '-').split('→')[0].trim();
            sentimentBadge.classList.add(sentimentClass);
        }
        
        // Update analysis text
        document.getElementById('analysisText').textContent = data.analysis || 'No analysis data available.';
        
        // Update confidence bars
        this.updateConfidenceBars(data.confidence);
        
        // Update data source
        document.getElementById('dataSource').textContent = `Powered by: ${data.method || 'Waiting for data...'}`;
        
        // Update timestamp
        document.getElementById('lastUpdate').textContent = `Last update: ${data.timestamp || 'Never'}`;
    }

    updateConfidenceBars(confidence) {
        const positivePercent = Math.round((confidence.positive || 0) * 100);
        const negativePercent = Math.round((confidence.negative || 0) * 100);
        const neutralPercent = Math.round((confidence.neutral || 0) * 100);

        // Update percentages
        document.getElementById('positivePercent').textContent = `${positivePercent}%`;
        document.getElementById('negativePercent').textContent = `${negativePercent}%`;
        document.getElementById('neutralPercent').textContent = `${neutralPercent}%`;

        // Update bar widths with animation
        setTimeout(() => {
            document.getElementById('positiveBar').style.width = `${positivePercent}%`;
            document.getElementById('negativeBar').style.width = `${negativePercent}%`;
            document.getElementById('neutralBar').style.width = `${neutralPercent}%`;
        }, 100);
    }

    animateChanges() {
        // Add pulse animation to sentiment badge
        const sentimentBadge = document.getElementById('sentimentBadge');
        sentimentBadge.classList.add('pulse');
        setTimeout(() => sentimentBadge.classList.remove('pulse'), 500);

        // Add animation to confidence bars
        const bars = document.querySelectorAll('.confidence-fill');
        bars.forEach(bar => {
            bar.style.transition = 'width 1s ease-in-out';
        });
    }

    addVisualEffects() {
        // Add hover effects to cards
        const cards = document.querySelectorAll('.analysis-card, .instructions-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 15px 40px rgba(0, 212, 255, 0.2)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
            });
        });
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new StockDashboard();
    
    // Add loading animation
    console.log('🚀 Bloomy Dashboard initialized');
    console.log('📊 Waiting for stock analysis data from Discord bot...');
});

// In your app.js - Add this function to update the query results
async function updateQueryResults() {
    try {
        const response = await fetch('/api/latest-query');
        const data = await response.json();
        
        if (data && data.hasData) {
            displayQueryResults(data);
        }
        
    } catch (error) {
        console.error('Error updating query results:', error);
    }
}

function displayQueryResults(data) {
    const queryStatus = document.getElementById('queryStatus');
    const intentSection = document.getElementById('intentSection');
    const intentBadge = document.getElementById('intentBadge');
    const parametersSection = document.getElementById('parametersSection');
    const parametersList = document.getElementById('parametersList');
    const bloombergData = document.getElementById('bloombergData');
    const dataContent = document.getElementById('dataContent');

    // Update status
    queryStatus.innerHTML = `<i class="fas fa-sync-alt"></i><span>Latest query processed: ${new Date().toLocaleTimeString()}</span>`;

    // Display intent
    if (data.intent) {
        intentSection.style.display = 'block';
        intentBadge.textContent = formatIntent(data.intent);
        intentBadge.className = 'intent-badge ' + getIntentClass(data.intent);
    }

    // Display parameters
    if (data.params && Object.keys(data.params).length > 0) {
        parametersSection.style.display = 'block';
        parametersList.innerHTML = '';
        
        for (const [key, value] of Object.entries(data.params)) {
            const paramItem = document.createElement('div');
            paramItem.className = 'parameter-item';
            paramItem.innerHTML = `
                <span class="param-key">${formatKey(key)}:</span>
                <span class="param-value">${value || 'N/A'}</span>
            `;
            parametersList.appendChild(paramItem);
        }
    }

    // Display Bloomberg data
    if (data.bloomberg) {
        bloombergData.style.display = 'block';
        dataContent.innerHTML = formatBloombergData(data.bloomberg);
    }
}

// Add this to your existing polling
setInterval(updateQueryResults, 3000); // Check for new queries every 3 seconds
updateQueryResults(); // Initial call