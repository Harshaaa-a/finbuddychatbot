import { ChatInterface } from "@/components/ChatInterface";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent))_0%,transparent_50%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-10" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <header className="text-center mb-8 md:mb-12 animate-fade-in">
          <div className="inline-block mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-primary flex items-center gap-2 justify-center">
              FinBuddy <span className="text-5xl md:text-6xl">💸</span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-foreground/90 font-medium mb-2">
            Your AI-powered investment buddy
          </p>
          <p className="text-muted-foreground max-w-md mx-auto">
            Learn smart investing habits, one chat at a time.
          </p>
        </header>

        {/* Chat Interface */}
        <main className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <ChatInterface />
        </main>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-[var(--finbuddy-shadow)] hover:shadow-[var(--finbuddy-shadow-lg)] transition-shadow">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-sm mb-1">Learn Basics</h3>
            <p className="text-xs text-muted-foreground">Understand stocks, mutual funds, and more</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-[var(--finbuddy-shadow)] hover:shadow-[var(--finbuddy-shadow-lg)] transition-shadow">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-sm mb-1">Set Goals</h3>
            <p className="text-xs text-muted-foreground">Plan for your financial future</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-[var(--finbuddy-shadow)] hover:shadow-[var(--finbuddy-shadow-lg)] transition-shadow">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="font-semibold text-sm mb-1">Get Tips</h3>
            <p className="text-xs text-muted-foreground">Personalized investment advice</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
          Made with ❤️ by FinBuddy Team
        </footer>
      </div>
    </div>
  );
};

export default Index;
