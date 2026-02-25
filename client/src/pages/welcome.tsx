import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad2, Users, MessageCircle, Trophy, Zap, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";

export default function Welcome() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { joinGame, isConnected } = useWebSocket();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/login", {
        username: trimmedUsername,
        password: trimmedPassword,
      });
      
      const data = await response.json();
      if (data.success) {
        joinGame(data.username);
        navigate("/home");
      }
    } catch (err: any) {
      const errorData = await err?.json?.().catch(() => null);
      setError(errorData?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      setError("Please fill in all fields");
      return;
    }
    
    if (trimmedUsername.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    if (trimmedUsername.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }
    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/register", {
        username: trimmedUsername,
        password: trimmedPassword,
      });
      
      const data = await response.json();
      if (data.success) {
        joinGame(data.username);
        navigate("/home");
      }
    } catch (err: any) {
      const errorData = await err?.json?.().catch(() => null);
      setError(errorData?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setUsername("");
    setPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-success/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-warning/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 mb-4 animate-bounce-in">
            <Gamepad2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Game<span className="text-primary">Hub</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Play together with friends in real-time
          </p>
        </div>

        <Card className="border-border/50 shadow-xl animate-slide-up">
          <CardContent className="p-6">
            <Tabs defaultValue="login" className="w-full" onValueChange={clearForm}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login" className="gap-2" data-testid="tab-login">
                  <LogIn className="w-4 h-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="gap-2" data-testid="tab-register">
                  <UserPlus className="w-4 h-4" />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="login-username" className="text-sm font-medium text-foreground">
                      Username
                    </label>
                    <Input
                      id="login-username"
                      data-testid="input-login-username"
                      type="text"
                      placeholder="Enter your username..."
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError("");
                      }}
                      className="h-12 text-lg bg-muted/50 border-border focus:border-primary focus:ring-primary transition-all"
                      autoComplete="username"
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        data-testid="input-login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password..."
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        className="h-12 text-lg bg-muted/50 border-border focus:border-primary focus:ring-primary transition-all pr-12"
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive animate-fade-in" data-testid="text-error">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    data-testid="button-login"
                    className="w-full h-12 text-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                    disabled={!isConnected || loading}
                  >
                    {loading ? (
                      "Logging in..."
                    ) : isConnected ? (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Login
                      </>
                    ) : (
                      "Connecting..."
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="register-username" className="text-sm font-medium text-foreground">
                      Choose your username
                    </label>
                    <Input
                      id="register-username"
                      data-testid="input-register-username"
                      type="text"
                      placeholder="Enter a username..."
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError("");
                      }}
                      className="h-12 text-lg bg-muted/50 border-border focus:border-primary focus:ring-primary transition-all"
                      autoComplete="username"
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="register-password" className="text-sm font-medium text-foreground">
                      Create a password
                    </label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        data-testid="input-register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters..."
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        className="h-12 text-lg bg-muted/50 border-border focus:border-primary focus:ring-primary transition-all pr-12"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password-register"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive animate-fade-in" data-testid="text-register-error">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    data-testid="button-register"
                    className="w-full h-12 text-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                    disabled={!isConnected || loading}
                  >
                    {loading ? (
                      "Creating account..."
                    ) : isConnected ? (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Create Account & Play
                      </>
                    ) : (
                      "Connecting..."
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <FeatureCard icon={Users} label="Multiplayer" />
          <FeatureCard icon={MessageCircle} label="Live Chat" />
          <FeatureCard icon={Trophy} label="Compete" />
        </div>

        <div className="text-center space-y-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <p className="text-muted-foreground text-sm">Available Games</p>
          <div className="flex flex-wrap justify-center gap-3">
            <GameBadge name="Tic Tac Toe" />
            <GameBadge name="Rock Paper Scissors" />
            <GameBadge name="Riddles" />
            <GameBadge name="Word Scramble" />
            <GameBadge name="Quick Math" />
            <GameBadge name="Number Guess" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 text-center text-muted-foreground/50 text-sm">
        {isConnected ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
            Connecting to server...
          </span>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50 hover-elevate">
      <Icon className="w-6 h-6 text-primary" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function GameBadge({ name }: { name: string }) {
  return (
    <span className="px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground text-xs font-medium border border-border/50">
      {name}
    </span>
  );
}
