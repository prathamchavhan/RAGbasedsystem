"use client";

import { useEffect, useState, useRef } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import gsap from "gsap";
import { FileText, Sparkles, Wand2, Shield, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const bgRef = useRef(null);
  const floatingIconsRef = useRef(null);

  const titleText = "Unlock the knowledge inside your documents.";
  const titleChars = titleText.split("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!loading && bgRef.current) {
      // GSAP background animation
      gsap.to(bgRef.current, {
        backgroundPosition: "200% center",
        ease: "none",
        duration: 15,
        repeat: -1,
      });

      // GSAP floating icons animation
      if (floatingIconsRef.current) {
        const icons = floatingIconsRef.current.children;
        gsap.to(icons, {
          y: "random(-20, 20)",
          x: "random(-20, 20)",
          rotation: "random(-15, 15)",
          duration: "random(2, 4)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.2,
        });
      }
    }
  }, [loading]);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error.code === "auth/popup-blocked" || error.code === "auth/popup-cancelled") {
        await signInWithRedirect(auth, googleProvider);
      }
    }
  };

  const loginWithEmail = (e) => {
    e.preventDefault();
    alert(`Email login initiated for: ${email}\n(Note: Ensure Email/Password provider is enabled in Firebase)`);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <FileText className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden selection:bg-primary/20">

      {/* LEFT SIDE - VISUAL/BRANDING */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="hidden lg:flex w-1/2 relative bg-card text-card-foreground overflow-hidden flex-col justify-between p-12 shadow-2xl z-20 rounded-r-3xl border-r"
      >
        {/* Animated Background Mesh */}
        <div
          ref={bgRef}
          className="absolute inset-0 z-0 opacity-20 dark:opacity-40 bg-[length:200%_200%] bg-gradient-to-br from-zinc-500/20 via-zinc-400/10 to-transparent"
          style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
        />
        <div className="absolute inset-0 z-0 bg-background/50 mix-blend-overlay backdrop-blur-3xl" />

        {/* Content */}
        <div className="relative z-10 space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-xl backdrop-blur-md border">
              <FileText className="w-8 h-8 text-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">PDF Chat</span>
          </motion.div>
        </div>

        <div className="relative z-10 mt-auto mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="max-w-xl space-y-6"
          >
            <h1 className="text-5xl font-extrabold tracking-tight leading-tight text-white flex flex-wrap gap-x-3">
              {titleText.split(" ").map((word, wordIndex) => (
                <span key={wordIndex} className="inline-block overflow-hidden">
                  {word.split("").map((char, charIndex) => (
                    <motion.span
                      key={charIndex}
                      className={`inline-block ${word === "knowledge" ? "font-black" : ""}`}
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        duration: 0.8,
                        delay: 1.0 + (wordIndex * 5 + charIndex) * 0.08,
                        ease: [0.33, 1, 0.68, 1],
                      }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>
            <motion.p
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 3.5, duration: 1.5 }}
              className="text-lg text-muted-foreground leading-relaxed font-medium"
            >
              Upload any PDF and instantly start interacting. Ask questions, extract summaries, and save hours of reading with our AI-powered assistant.
            </motion.p>

            <div className="flex items-center gap-4 pt-4 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-foreground" /> Secure
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-foreground" /> AI-Powered
              </div>
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-foreground" /> Instant
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Icons Decor */}
        <div ref={floatingIconsRef} className="absolute top-1/2 right-12 bottom-0 w-64 h-64 z-10 opacity-40 pointer-events-none">
          <div className="absolute top-0 right-0 p-4 bg-muted/50 backdrop-blur-md rounded-2xl border shadow-lg text-foreground">
            <FileText className="w-10 h-10" />
          </div>
          <div className="absolute top-32 left-10 p-4 bg-muted/50 backdrop-blur-md rounded-2xl border shadow-lg text-foreground">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="absolute bottom-10 right-20 p-4 bg-muted/50 backdrop-blur-md rounded-2xl border shadow-lg text-foreground">
            <Wand2 className="w-12 h-12" />
          </div>
        </div>
      </motion.div>

      {/* RIGHT SIDE - AUTH */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 relative z-10 w-full lg:w-1/2 bg-background">
        <div className="absolute top-8 right-8 z-50">
          <ThemeToggle />
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">PDF Chat</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <div className="space-y-6">
            <Button
              onClick={loginWithGoogle}
              variant="outline"
              className="w-full h-12 text-sm font-medium hover:bg-muted/50 transition-all flex items-center gap-2 relative group"
            >
              <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
              <ArrowRight className="w-4 h-4 absolute right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={loginWithEmail} className="space-y-4">
              <div className="space-y-2 block relative">
                <Label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="h-12 px-4 shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 font-medium shadow-sm">
                Sign In with Email
              </Button>
            </form>
          </div>

          <div className="pt-6 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
