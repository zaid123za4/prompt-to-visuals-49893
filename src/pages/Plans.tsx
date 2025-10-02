import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Zap, Crown, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const plans = [
    {
      name: "Free",
      icon: Zap,
      price: "$0",
      period: "/month",
      description: "Perfect for trying out our AI video studio",
      features: [
        "100 credits/month",
        "Basic video styles",
        "720p resolution",
        "Watermark included",
        "Community support"
      ],
      credits: 100,
      highlighted: false
    },
    {
      name: "Pro",
      icon: Crown,
      price: "$29",
      period: "/month",
      description: "For creators who want more power",
      features: [
        "1000 credits/month",
        "All video styles",
        "1080p resolution",
        "No watermark",
        "Priority support",
        "Advanced AI features",
        "Custom branding"
      ],
      credits: 1000,
      highlighted: true
    },
    {
      name: "Team",
      icon: Rocket,
      price: "$99",
      period: "/month",
      description: "For teams and businesses",
      features: [
        "5000 credits/month",
        "All Pro features",
        "4K resolution",
        "Team collaboration",
        "API access",
        "Dedicated support",
        "Custom integrations",
        "Analytics dashboard"
      ],
      credits: 5000,
      highlighted: false
    }
  ];

  const handleSubscribe = (planName: string) => {
    toast({
      title: "Coming Soon",
      description: `${planName} subscription will be available soon!`
    });
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6 hover-scale"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Studio
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-creative bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your ideas into stunning AI-generated videos. Select the perfect plan for your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.name}
                className={`backdrop-blur-sm bg-card/50 border-border/50 animate-scale-in relative overflow-hidden ${
                  plan.highlighted ? "border-primary shadow-glow" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-gradient-primary text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${plan.highlighted ? "bg-primary/20" : "bg-muted/50"}`}>
                      <Icon className={`w-6 h-6 ${plan.highlighted ? "text-primary" : "text-foreground"}`} />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  
                  <div className="pt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground pt-2">
                    {plan.credits} credits included
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full hover-scale ${
                      plan.highlighted 
                        ? "bg-gradient-primary hover:opacity-90" 
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() => handleSubscribe(plan.name)}
                  >
                    {plan.name === "Free" ? "Current Plan" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Need a custom solution? Contact us for enterprise pricing.
          </p>
          <Button variant="outline" className="hover-scale">
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Plans;
