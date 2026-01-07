import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, useTheme } from "../App";
import { Button } from "../components/ui/button";
import { Image, Video, Mic, Sparkles, ArrowRight, Moon, Sun } from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    {
      icon: Image,
      title: "AI Image Generation",
      description: "Create stunning visuals with OpenAI and Fal.ai",
      gradient: "from-pink-500 to-rose-500"
    },
    {
      icon: Video,
      title: "AI Video Creation",
      description: "Generate videos with Kling AI and Fal.ai",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Mic,
      title: "Voice Synthesis",
      description: "Clone voices with ElevenLabs and Fal.ai",
      gradient: "from-purple-500 to-violet-500"
    }
  ];

  const galleryImages = [
    { url: "https://images.pexels.com/photos/8717531/pexels-photo-8717531.jpeg", alt: "Cinematic AI Portrait" },
    { url: "https://images.pexels.com/photos/9063025/pexels-photo-9063025.jpeg", alt: "Surreal Landscape" },
    { url: "https://images.unsplash.com/photo-1728330458318-70438beffc44?crop=entropy&cs=srgb&fm=jpg&q=85", alt: "Cyberpunk City" },
    { url: "https://images.pexels.com/photos/5011647/pexels-photo-5011647.jpeg", alt: "Abstract 3D Art" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-orange-500" />
            <span className="font-heading font-bold text-xl">Creati Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              data-testid="theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              onClick={handleLogin}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6"
              data-testid="login-btn"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1692599571997-638cce53e54a?crop=entropy&cs=srgb&fm=jpg&q=85)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="uppercase tracking-widest text-xs text-orange-500 font-medium mb-4">
              AI Creative Studio
            </p>
            <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight mb-6">
              Create{" "}
              <span className="text-gradient">Stunning</span>
              {" "}AI Content
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Connect your favorite AI APIs—Kling AI, Fal.ai, OpenAI, ElevenLabs—and generate 
              images, videos, and voices all in one powerful creative studio.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={handleLogin}
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 neon-glow-hover"
                data-testid="hero-cta-btn"
              >
                Start Creating <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 border-border"
                data-testid="learn-more-btn"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-8 rounded-2xl border border-border bg-card hover:border-orange-500/50 transition-colors duration-300"
                data-testid={`feature-card-${index}`}
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="uppercase tracking-widest text-xs text-orange-500 font-medium mb-4">
              Gallery
            </p>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
              Explore AI Creations
            </h2>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative aspect-square rounded-xl overflow-hidden group"
                data-testid={`gallery-image-${index}`}
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white text-sm font-medium">{image.alt}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight mb-6">
              Ready to Create?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Connect your API keys and start generating amazing content with the power of AI.
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-10 neon-glow"
              data-testid="final-cta-btn"
            >
              Get Started Free
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="font-heading font-bold">Creati Studio</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Creati Studio. Powered by AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
