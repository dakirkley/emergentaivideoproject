import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth, useTheme, API } from "../App";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import Layout from "../components/Layout";
import { Image, Video, Mic, FolderOpen, Settings, Sparkles, ArrowRight, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [apiKeysStatus, setApiKeysStatus] = useState(null);
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [keysRes, galleryRes] = await Promise.all([
        axios.get(`${API}/settings/api-keys`, { withCredentials: true }),
        axios.get(`${API}/gallery?limit=6`, { withCredentials: true })
      ]);
      setApiKeysStatus(keysRes.data);
      setRecentGenerations(galleryRes.data.generations || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    {
      id: "image",
      icon: Image,
      title: "Image Generation",
      description: "Create stunning images with AI",
      href: "/generate/image",
      gradient: "from-pink-500 to-rose-500",
      providers: ["OpenAI", "Fal.ai"],
      hasKey: apiKeysStatus?.has_openai_key || apiKeysStatus?.use_emergent_key || apiKeysStatus?.has_fal_key
    },
    {
      id: "video",
      icon: Video,
      title: "Video Generation",
      description: "Generate videos from text or images",
      href: "/generate/video",
      gradient: "from-blue-500 to-cyan-500",
      providers: ["Kling AI", "Fal.ai"],
      hasKey: apiKeysStatus?.has_kling_key || apiKeysStatus?.has_fal_key
    },
    {
      id: "voice",
      icon: Mic,
      title: "Voice Generation",
      description: "Clone and synthesize voices",
      href: "/generate/voice",
      gradient: "from-purple-500 to-violet-500",
      providers: ["ElevenLabs", "Fal.ai"],
      hasKey: apiKeysStatus?.has_elevenlabs_key || apiKeysStatus?.has_fal_key
    }
  ];

  const quickLinks = [
    { icon: FolderOpen, label: "Gallery", href: "/gallery" },
    { icon: Settings, label: "Settings", href: "/settings" }
  ];

  const needsSetup = apiKeysStatus && !apiKeysStatus.has_kling_key && !apiKeysStatus.has_fal_key && !apiKeysStatus.has_elevenlabs_key && !apiKeysStatus.has_openai_key && !apiKeysStatus.use_emergent_key;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
              Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground mt-1">What would you like to create today?</p>
          </div>
          <div className="flex gap-2">
            {quickLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button variant="outline" className="rounded-full" data-testid={`quick-link-${link.label.toLowerCase()}`}>
                  <link.icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Setup Alert */}
        {needsSetup && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 border-orange-500/50 bg-orange-500/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Setup Required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure your API keys to start generating content.
                  </p>
                </div>
                <Link to="/settings">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full" data-testid="setup-keys-btn">
                    Setup Keys
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tools Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={tool.href}>
                <Card 
                  className="group p-6 h-full border border-border hover:border-orange-500/50 transition-colors duration-300 cursor-pointer"
                  data-testid={`tool-card-${tool.id}`}
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${tool.gradient} mb-4`}>
                    <tool.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-2">{tool.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{tool.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {tool.providers.map((provider) => (
                        <span 
                          key={provider}
                          className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {provider}
                        </span>
                      ))}
                    </div>
                    {!tool.hasKey && (
                      <span className="text-xs text-orange-500">Setup needed</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center text-orange-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Creating <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Recent Generations */}
        {recentGenerations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-xl">Recent Creations</h2>
              <Link to="/gallery">
                <Button variant="ghost" size="sm" className="text-orange-500" data-testid="view-all-gallery">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {recentGenerations.map((gen, index) => (
                <motion.div
                  key={gen.generation_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-square rounded-xl overflow-hidden bg-secondary"
                  data-testid={`recent-gen-${index}`}
                >
                  {gen.type === "image" && gen.result_url && (
                    <img src={gen.result_url} alt={gen.prompt} className="w-full h-full object-cover" />
                  )}
                  {gen.type === "video" && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {gen.type === "voice" && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Mic className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && recentGenerations.length === 0 && !needsSetup && (
          <Card className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl mb-2">No creations yet</h3>
            <p className="text-muted-foreground mb-6">Start generating amazing content with AI</p>
            <Link to="/generate/image">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full" data-testid="start-creating-btn">
                Create Your First Image
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </Layout>
  );
}
