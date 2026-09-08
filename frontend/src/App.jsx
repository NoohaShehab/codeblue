import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BedDouble,
  FileText,
  Mail,
  Settings,
  HelpCircle,
  Sun,
  Search,
  Plus,
  Bell,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  TrendingUp,
  TrendingDown,
  UserCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

// Backend client helper
import { getDashboardSummary, getRecentEvents } from './api/telemetry';
import { getVisits } from './api/visits';
import { getDepartments } from './api/departments';

// Monthly visits dummy dataset to match reference bar chart aesthetic
const MONTHLY_DATA = [
  { month: 'Jan', count: 680000 },
  { month: 'Feb', count: 720000 },
  { month: 'Mar', count: 610000 },
  { month: 'Apr', count: 810000 },
  { month: 'May', count: 750000 },
  { month: 'Jun', count: 690000 },
  { month: 'Jul', count: 830000 },
  { month: 'Aug', count: 925453, active: true },
  { month: 'Sep', count: 740000 },
  { month: 'Oct', count: 790000 },
  { month: 'Nov', count: 710000 },
  { month: 'Dec', count: 760000 },
];

export default function App() {
  const [summary, setSummary] = useState({
    total_beds: 120,
    occupied_beds: 98,
    total_patients: 862,
    active_visits: 456,
    critical_events_count: 3
  });

  const [schedule, setSchedule] = useState([
    { time: '10:00 AM', doctor: 'Dr. Marcus Vance', specialty: 'General Practice', patient: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&h=100&fit=crop&crop=faces' },
    { time: '10:30 AM', doctor: 'Dr. Aris Thorne', specialty: 'Cardiology', patient: 'David Chen', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=100&h=100&fit=crop&crop=faces' },
    { time: '11:00 AM', doctor: 'Dr. Sarah Connor', specialty: 'Emergency Medicine', patient: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1594824813501-48e028b12282?w=100&h=100&fit=crop&crop=faces' },
    { time: '11:30 AM', doctor: 'Dr. Michael Ross', specialty: 'Neurology', patient: 'Michael Brooks', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=faces' },
  ]);

  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Fetch live metrics from your FastAPI server
    getDashboardSummary()
      .then((res) => { if (res) setSummary(res); })
      .catch((err) => console.log('Serving offline mock data until backend is booted:', err));
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f1f3f7] text-[#1e293b] p-3 gap-3">
      {/* ----------------- SIDEBAR ----------------- */}
      <aside className="w-16 bg-white rounded-2xl flex flex-col items-center py-6 justify-between shadow-sm border border-slate-100">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/30">
            D
          </div>
          <nav className="flex flex-col gap-4 mt-2">
            <button className="p-2.5 rounded-xl bg-blue-50 text-blue-600 transition-colors">
              <LayoutDashboard size={20} />
            </button>
            <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <Calendar size={20} />
            </button>
            <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <Users size={20} />
            </button>
            <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <BedDouble size={20} />
            </button>
            <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <FileText size={20} />
            </button>
            <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <Mail size={20} />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
            <Settings size={20} />
          </button>
          <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
            <HelpCircle size={20} />
          </button>
          <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
            <Sun size={20} />
          </button>
        </div>
      </aside>

      {/* ----------------- MAIN CONTENT ----------------- */}
      <div className="flex-1 flex flex-col gap-3">
        {/* TOP NAVBAR */}
        <header className="h-16 bg-white rounded-2xl px-6 flex items-center justify-between shadow-sm border border-slate-100">
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-2 font-bold text-lg text-slate-800 tracking-tight">
              <span className="text-blue-600 font-extrabold text-xl">CODE BLUE</span>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search patient, doctor, appointment..."
                className="w-full bg-[#f8fafc] text-sm pl-10 pr-4 py-2 rounded-xl border-none outline-none text-slate-600 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Plus size={14} /> Appointment
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Plus size={14} /> Patient
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Plus size={14} /> Transfer
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Plus size={14} /> Note
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-1" />

            <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
            <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100">
              <Settings size={18} />
            </button>
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-blue-500/20 cursor-pointer">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY GRID */}
        <div className="grid grid-cols-12 gap-3 flex-1">
          {/* LEFT 9 COLUMNS */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-3">
            {/* ROW 1: 3 STAT CARDS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
                  <span>Today's Visits</span>
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                    <UserCheck size={13} />
                  </div>
                </div>
                <div className="my-2">
                  <h3 className="text-3xl font-bold text-slate-800">{summary.active_visits}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                  <span className="bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <TrendingUp size={12} /> +20%
                  </span>
                  <span className="text-slate-400 font-normal">vs last week</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
                  <span>Total Patients</span>
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                    <Users size={13} />
                  </div>
                </div>
                <div className="my-2">
                  <h3 className="text-3xl font-bold text-slate-800">{summary.total_patients}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-500">
                  <span className="bg-rose-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <TrendingDown size={12} /> -12%
                  </span>
                  <span className="text-slate-400 font-normal">vs last week</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
                  <span>Beds Occupied</span>
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                    <BedDouble size={13} />
                  </div>
                </div>
                <div className="my-2">
                  <h3 className="text-3xl font-bold text-slate-800">{summary.occupied_beds} <span className="text-lg font-normal text-slate-400">/ {summary.total_beds}</span></h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                  <span className="bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <TrendingUp size={12} /> +05%
                  </span>
                  <span className="text-slate-400 font-normal">vs last week</span>
                </div>
              </div>
            </div>

            {/* ROW 2: SCHEDULE & QUEUE STATUS */}
            <div className="grid grid-cols-12 gap-3">
              {/* Today's Schedule Table */}
              <div className="col-span-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-slate-800">Today's Schedule</h4>
                  <button className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg">
                    This day <ChevronDown size={13} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-50 pb-2">
                        <th className="pb-2 font-medium">Time</th>
                        <th className="pb-2 font-medium">Doctor</th>
                        <th className="pb-2 font-medium">Patient</th>
                        <th className="pb-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {schedule.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 font-medium text-slate-500">{item.time}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <img src={item.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                              <div>
                                <div className="font-semibold text-slate-700">{item.doctor}</div>
                                <div className="text-[10px] text-slate-400">{item.specialty}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 font-medium text-slate-600">{item.patient}</td>
                          <td className="py-2.5 text-right text-slate-400 cursor-pointer">
                            <MoreHorizontal size={16} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Queue Status (Semi-circle donut representation) */}
              <div className="col-span-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800">Queue Status</h4>
                  <button className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg">
                    This day <ChevronDown size={13} />
                  </button>
                </div>

                <div className="relative h-32 flex items-center justify-center my-2">
                  {/* Gauge Arc Graphic */}
                  <svg viewBox="0 0 160 90" className="w-44">
                    <path
                      d="M 15 80 A 65 65 0 0 1 145 80"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 15 80 A 65 65 0 0 1 125 30"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray="200"
                      strokeDashoffset="25"
                    />
                  </svg>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="text-slate-500">Completed</span>
                    </div>
                    <span className="font-bold text-slate-700">428</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-900" />
                      <span className="text-slate-500">In consultation</span>
                    </div>
                    <span className="font-bold text-slate-700">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span className="text-slate-500">Waiting</span>
                    </div>
                    <span className="font-bold text-slate-700">434</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: PATIENTS STATUS (MONTHLY BAR CHART) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-1">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h4 className="text-xs text-slate-400 font-medium">Patients Status</h4>
                  <div className="text-2xl font-bold text-slate-800">745,453</div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    <span className="text-slate-500">Consultation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
                    <span className="text-slate-500">Check-Up</span>
                  </div>
                  <button className="text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                    Monthly <ChevronDown size={13} />
                  </button>
                </div>
              </div>

              <div className="h-44 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {MONTHLY_DATA.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.active ? '#1e293b' : '#f1f5f9'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* RIGHT 3 COLUMNS */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            {/* AI Assistant Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-full flex justify-between items-center text-xs text-slate-400 font-medium mb-2">
                <span className="flex items-center gap-1 font-bold text-slate-700">
                  <Sparkles size={14} className="text-blue-500" /> AI Assistant
                </span>
                <HelpCircle size={14} />
              </div>

              {/* Holographic 3D sphere illusion */}
              <div className="w-24 h-24 my-3 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-400 to-pink-300 shadow-lg shadow-purple-500/20 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-white/40 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-800">Welcome back! Lets see</h4>
              <p className="text-xs text-slate-500">todays updates.</p>

              {/* Alert Notification Chip */}
              <div className="w-full mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                    !
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                    Dr. Marcus Vance is overbooked after 2PM
                  </p>
                </div>
                <button className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1 hover:underline">
                  Show notice? &gt;
                </button>
              </div>

              <div className="flex gap-1 mt-4">
                <span className="w-5 h-1 bg-purple-500 rounded-full" />
                <span className="w-1.5 h-1 bg-slate-200 rounded-full" />
                <span className="w-1.5 h-1 bg-slate-200 rounded-full" />
              </div>
            </div>

            {/* Patient Demographics Split Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-700">Patient</h4>
                <button className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg">
                  Monthly <ChevronDown size={11} />
                </button>
              </div>

              <div className="flex justify-between items-center text-xs mb-2">
                <div>
                  <div className="text-[10px] text-slate-400">New Patients</div>
                  <div className="text-base font-bold text-slate-800">320</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Old Patient</div>
                  <div className="text-base font-bold text-slate-800">136</div>
                </div>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex my-2">
                <div className="bg-slate-900 h-full w-[70%]" />
                <div className="bg-blue-400 h-full w-[30%]" />
              </div>

              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-1">
                <span>70%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Gender Distribution Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700">Gender</h4>
                <button className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg">
                  This Day <ChevronDown size={11} />
                </button>
              </div>

              <div className="flex items-center justify-between my-2">
                {/* Gauge / Donut Mini Representation */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-blue-600"
                      strokeDasharray="58, 100"
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xs font-bold text-slate-800">428</span>
                    <div className="text-[8px] text-blue-600 font-semibold">58%</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-blue-600" /> Man
                    </div>
                    <div className="font-bold text-slate-800 text-sm pl-3.5">248</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-blue-300" /> Woman
                    </div>
                    <div className="font-bold text-slate-800 text-sm pl-3.5">170</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
