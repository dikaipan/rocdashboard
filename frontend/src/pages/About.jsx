import React from "react";
import { Info, Target, Users, Cpu, TrendingUp, Code, Database, Layers } from "react-feather";
import { getGradientCard, TEXT_STYLES, cn } from '../constants/styles';
import { useTheme } from '../contexts/ThemeContext';

export default function About() {
  const { isDark } = useTheme();
  const features = [
    {
      icon: Users,
      title: "Engineer Management",
      description: "Kelola data engineer dengan informasi lengkap termasuk skill level, training status, dan pengalaman kerja."
    },
    {
      icon: Cpu,
      title: "Machine Tracking",
      description: "Monitor seluruh mesin customer dengan detail warranty status, maintenance schedule, dan informasi teknis."
    },
    {
      icon: TrendingUp,
      title: "Decision Intelligence",
      description: "Analisis mendalam dengan comparison charts, distance analysis, dan actionable recommendations."
    }
  ];

  const techStack = [
    { category: "Frontend", items: ["React.js", "Recharts", "Tailwind CSS", "React Feather Icons"] },
    { 
      category: "Backend", 
      items: [
        "Python (Flask/FastAPI)",
        "REST API endpoints (/api/engineers, /api/machines)",
        "CORS enabled untuk cross-origin requests",
        "CSV parsing dengan pandas/csv library"
      ] 
    },
    { category: "Database", items: ["CSV Data Management", "Real-time Processing"] },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className={getGradientCard('blue', false)}>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Info className="text-blue-400" size={32} />
          </div>
          <div className="flex-1">
            <h1 className={TEXT_STYLES.heading1}>ROC Dashboard</h1>
            <p className={cn('text-lg mb-4', isDark ? 'text-slate-300' : 'text-gray-700')}>Engineering & Machine Management System</p>
            <p className={cn(isDark ? 'text-slate-300' : 'text-gray-700')}>
              Dashboard management system untuk memantau dan mengelola data engineer serta mesin customer. 
              Dilengkapi dengan analisis mendalam dan decision support untuk optimasi operasional.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Target className="text-green-400" size={24} />
          Main Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Icon className="text-blue-400" size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                </div>
                <p className={cn('text-sm leading-relaxed', isDark ? 'text-slate-300' : 'text-gray-700')}>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Code className="text-purple-400" size={24} />
          Technology Stack
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {techStack.map((tech, idx) => (
            <div
              key={idx}
              className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700"
            >
              <div className="flex items-center gap-2 mb-4">
                {tech.category === "Frontend" && <Layers className="text-cyan-400" size={20} />}
                {tech.category === "Backend" && <Code className="text-green-400" size={20} />}
                {tech.category === "Database" && <Database className="text-orange-400" size={20} />}
                <h3 className="text-lg font-semibold text-slate-100">{tech.category}</h3>
              </div>
              <ul className="space-y-2">
                {tech.items.map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={getGradientCard('blue', false)}>
          <p className={TEXT_STYLES.kpiSubtitle}>Pages</p>
          <p className={cn('text-3xl font-bold text-blue-400')}>4</p>
          <p className={TEXT_STYLES.kpiSubtitle}>Dashboard, Engineer, Mesin, Decision</p>
        </div>
        <div className={getGradientCard('green', false)}>
          <p className={TEXT_STYLES.kpiSubtitle}>Analysis Cards</p>
          <p className={cn('text-3xl font-bold text-green-400')}>4</p>
          <p className={TEXT_STYLES.kpiSubtitle}>Interactive comparison & insights</p>
        </div>
        <div className={getGradientCard('purple', false)}>
          <p className={TEXT_STYLES.kpiSubtitle}>Chart Types</p>
          <p className={cn('text-3xl font-bold text-purple-400')}>5+</p>
          <p className={TEXT_STYLES.kpiSubtitle}>Bar, Line, Pie, Radar, Maps</p>
        </div>
        <div className={getGradientCard('orange', false)}>
          <p className={TEXT_STYLES.kpiSubtitle}>Data Points</p>
          <p className={cn('text-3xl font-bold text-orange-400')}>20K+</p>
          <p className={TEXT_STYLES.kpiSubtitle}>Engineers & Machines</p>
        </div>
      </div>

      {/* Version & Credits */}
      <div className={`${isDark ? 'bg-slate-800/50' : 'bg-gray-100'} backdrop-blur-sm p-6 rounded-xl border ${isDark ? 'border-slate-700' : 'border-gray-300'} text-center`}>
        <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
          <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>ROC Dashboard</span> v1.0
        </p>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Built with ❤️ for engineering & operations management
        </p>
      </div>
    </div>
  );
}
