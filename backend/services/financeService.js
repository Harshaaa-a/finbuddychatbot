const axios = require('axios');
const cron = require('node-cron');

class FinanceService {
  constructor() {
    this.dailyNews = [];
    this.marketData = {};
    this.lastUpdated = null;
    
    // Update finance data every hour
    cron.schedule('0 * * * *', () => {
      this.updateFinanceData();
    });
    
    // Initialize with data
    this.updateFinanceData();
  }

  async updateFinanceData() {
    try {
      await Promise.all([
        this.fetchMarketNews(),
        this.fetchMarketData()
      ]);
      this.lastUpdated = new Date();
      console.log('Finance data updated:', this.lastUpdated);
    } catch (error) {
      console.error('Error updating finance data:', error);
    }
  }

  async fetchMarketNews() {
    try {
      // Using Alpha Vantage free API for news
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'NEWS_SENTIMENT',
          tickers: 'AAPL,MSFT,GOOGL,TSLA,SPY,QQQ',
          apikey: process.env.ALPHA_VANTAGE_API_KEY,
          limit: 10
        }
      });

      if (response.data && response.data.feed) {
        this.dailyNews = response.data.feed.map(article => ({
          title: article.title,
          summary: article.summary,
          url: article.url,
          sentiment: article.overall_sentiment_label,
          relevance_score: article.relevance_score,
          published: article.time_published
        }));
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      // Fallback to sample news if API fails
      this.dailyNews = this.getFallbackNews();
    }
  }

  async fetchMarketData() {
    try {
      // Fetch key market indicators
      const symbols = ['SPY', 'QQQ', 'DIA', 'VTI'];
      const marketPromises = symbols.map(symbol => 
        axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: symbol,
            apikey: process.env.ALPHA_VANTAGE_API_KEY
          }
        })
      );

      const responses = await Promise.all(marketPromises);
      
      responses.forEach((response, index) => {
        if (response.data && response.data['Global Quote']) {
          const quote = response.data['Global Quote'];
          this.marketData[symbols[index]] = {
            symbol: quote['01. symbol'],
            price: quote['05. price'],
            change: quote['09. change'],
            changePercent: quote['10. change percent']
          };
        }
      });
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Fallback data
      this.marketData = this.getFallbackMarketData();
    }
  }

  getFallbackNews() {
    return [
      {
        title: "Federal Reserve Maintains Interest Rates",
        summary: "The Federal Reserve decided to maintain current interest rates, signaling a cautious approach to monetary policy.",
        sentiment: "Neutral",
        published: new Date().toISOString()
      },
      {
        title: "Tech Stocks Show Mixed Performance",
        summary: "Technology sector shows varied performance with some growth stocks gaining while others consolidate.",
        sentiment: "Mixed",
        published: new Date().toISOString()
      },
      {
        title: "Inflation Data Shows Continued Moderation",
        summary: "Latest inflation data suggests continued moderation in price pressures across key sectors.",
        sentiment: "Positive",
        published: new Date().toISOString()
      }
    ];
  }

  getFallbackMarketData() {
    return {
      'SPY': { symbol: 'SPY', price: '450.00', change: '+2.50', changePercent: '+0.56%' },
      'QQQ': { symbol: 'QQQ', price: '380.00', change: '+1.20', changePercent: '+0.32%' },
      'DIA': { symbol: 'DIA', price: '340.00', change: '-0.80', changePercent: '-0.23%' },
      'VTI': { symbol: 'VTI', price: '240.00', change: '+1.10', changePercent: '+0.46%' }
    };
  }

  getLatestNews() {
    return this.dailyNews.slice(0, 5); // Return top 5 news items
  }

  getMarketSummary() {
    return {
      data: this.marketData,
      lastUpdated: this.lastUpdated,
      summary: this.generateMarketSummary()
    };
  }

  generateMarketSummary() {
    if (Object.keys(this.marketData).length === 0) {
      return "Market data is currently being updated. Please try again in a few moments.";
    }

    const symbols = Object.keys(this.marketData);
    const positive = symbols.filter(symbol => 
      this.marketData[symbol].change && this.marketData[symbol].change.startsWith('+')
    );
    const negative = symbols.filter(symbol => 
      this.marketData[symbol].change && this.marketData[symbol].change.startsWith('-')
    );

    return `Market Summary: ${positive.length} ETFs up, ${negative.length} ETFs down. Overall market sentiment appears ${positive.length > negative.length ? 'positive' : positive.length < negative.length ? 'negative' : 'mixed'}.`;
  }

  // Get comprehensive context for AI
  getFinanceContext() {
    return {
      news: this.getLatestNews(),
      market: this.getMarketSummary(),
      lastUpdated: this.lastUpdated
    };
  }
}

module.exports = FinanceService;