import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Lock, 
  ArrowRight,
  Sparkles
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4 mr-2" />
          The future of community finance management
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-none pointer-events-none">
          Hamro <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Bachat</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Secure, transparent, and automated financial management for mutual funds and community savings groups.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          {session ? (
            <Link 
              href="/dashboard"
              className="group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link 
              href="/login"
              className="group relative px-10 py-4 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl font-bold text-lg shadow-2xl transition-all active:scale-95 flex items-center"
            >
              Sign In to Portal
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          
          <button className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl font-bold text-lg transition-all active:scale-95">
            Learn More
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-24 text-left">
          <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm group hover:border-emerald-500/30 transition-all">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Role-Based Security</h3>
            <p className="text-slate-400 leading-relaxed">Strict hierarchical permissions for Developers, Admins, and Members.</p>
          </div>

          <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm group hover:border-blue-500/30 transition-all">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Automated Finance</h3>
            <p className="text-slate-400 leading-relaxed">Smart calculation of interest, penalties, and loan repayment schedules.</p>
          </div>

          <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm group hover:border-purple-500/30 transition-all">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Member Portal</h3>
            <p className="text-slate-400 leading-relaxed">Personal dashboards for members to track savings and apply for assistance.</p>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 text-slate-500 text-sm font-medium flex items-center">
        <Lock className="w-4 h-4 mr-2" />
        Secured by Hamro Bachat Enterprise
      </footer>
    </main>
  );
}
