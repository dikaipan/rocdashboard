import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy, startTransition, useDeferredValue } from "react";
import { useNavigate } from 'react-router-dom';
import FilterTabs from "../components/ui/FilterTabs.jsx";
import { useEngineerData, useMachineData, useStockPartData, useFSLLocationData } from "../hooks/useEngineerData.js";
import { useStockPartKPIs } from "../hooks/useStockPartKPIs.js";
import { useMachineKPIs } from "../hooks/useMachineKPIs.js";
// Lazy load heavy components for better performance
const FullscreenChartModal = lazy(() => import("../components/dashboard/FullscreenChartModal.jsx"));
const MapWithRegions = lazy(() => import("../components/map/MapWithRegions.jsx"));
const SkillProgress = lazy(() => import("../components/charts/SkillProgress.jsx"));

// Import Recharts directly - it's already optimized by Vite
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

import { CHART_COLORS_DARK, CHART_COLORS_LIGHT } from "../utils/chartConfig.js";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { normalizeText, toTitleCase, normalizeAreaGroup } from "../utils/textUtils.js";
import { parseInstallYear, calculateMachineAge, categorizeByRange, groupByField, objectToChartData, groupByNormalizedAreaGroup } from "../utils/dashboardUtils.js";
import { limitChartData } from "../utils/chartOptimization.js";
import PageLayout from "../components/layout/PageLayout.jsx";
import LoadingSkeleton from "../components/common/LoadingSkeleton.jsx";
import { getGradientCard, getKPICard, TEXT_STYLES, cn } from "../constants/styles";
import { X, Search, ChevronLeft, ChevronRight, Download } from "react-feather";
import { useMachineFilters } from "../hooks/useMachineFilters.js";
import { exportMachinesToCSV } from "../utils/machineUtils.js";
import toast from 'react-hot-toast';


/**
 * ============================================================================
 * DASHBOARD COMPONENT - Main dashboard for ROC Engineering & Machine Management
 * ============================================================================
 * 
 * Komponen utama dashboard yang menampilkan overview data engineer dan mesin.
 * Telah direfactor dengan helper functions untuk improve maintainability.
 * 
 * FITUR UTAMA:
 * - Real-time KPI cards dengan visualisasi charts
 * - Interactive map untuk distribusi lokasi
 * - Filter dinamis (Region, Vendor, Area Group)
 * - Training progress tracking
 * - Machine analytics (age, warranty, installation trends)
 * - Fullscreen modal untuk detailed view
 * 
 * @returns {JSX.Element} Dashboard page component
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  // Get theme-aware chart colors
  const COLORS = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  
  // ============================================================================
  // DATA FETCHING - Load data dari API menggunakan custom hooks
  // ============================================================================
  const { rows: engineers, loading: engineersLoading } = useEngineerData();
  const { rows: machines, loading: machinesLoading } = useMachineData();
  const { rows: stockParts, loading: stockPartsLoading } = useStockPartData();
  const { rows: fslLocations, loading: fslLoading } = useFSLLocationData();
  
  // ============================================================================
  // UI STATE MANAGEMENT - State untuk filter dan UI interactions
  // ============================================================================
  const [category, setCategory] = useState("REGION");
  const [filterValue, setFilterValue] = useState("");
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showWarrantyInsightModal, setShowWarrantyInsightModal] = useState(false);
  const [showExpiringSoonModal, setShowExpiringSoonModal] = useState(false);
  const [showMachineListModal, setShowMachineListModal] = useState(false);
  const [machineListWarrantyFilter, setMachineListWarrantyFilter] = useState(""); // "On Warranty" or "Out Of Warranty"
  const [monthlyMachineData, setMonthlyMachineData] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  
  // Machine list modal filters
  const [machineListCustomerFilter, setMachineListCustomerFilter] = useState("");
  const [machineListRegionFilter, setMachineListRegionFilter] = useState("");
  const [machineListSearchTerm, setMachineListSearchTerm] = useState("");
  const [machineListCurrentPage, setMachineListCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const machineListItemsPerPage = 50;
  
  // Clear all filters for modal - defined early to avoid hoisting issues
  const handleClearMachineListFilters = useCallback(() => {
    setMachineListCustomerFilter("");
    setMachineListRegionFilter("");
    setMachineListWarrantyFilter("");
    setMachineListSearchTerm("");
    setMachineListCurrentPage(1);
  }, []);
  
  // Prevent body scroll when any modal is open
  useEffect(() => {
    const hasOpenModal = showMachineListModal || showActivationModal || showWarrantyInsightModal || showExpiringSoonModal || fullscreenChart;
    
    if (hasOpenModal) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      // Cleanup
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showMachineListModal, showActivationModal, showWarrantyInsightModal, showExpiringSoonModal, fullscreenChart]);
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        if (showMachineListModal) {
          setShowMachineListModal(false);
          handleClearMachineListFilters();
        } else if (fullscreenChart) {
          setFullscreenChart(null);
        } else if (showWarrantyInsightModal) {
          setShowWarrantyInsightModal(false);
        } else if (showExpiringSoonModal) {
          setShowExpiringSoonModal(false);
        } else if (showActivationModal) {
          setShowActivationModal(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showMachineListModal, fullscreenChart, showWarrantyInsightModal, showExpiringSoonModal, showActivationModal, handleClearMachineListFilters]);
  
  // Debounced search for machine list modal
  const [machineListDebouncedSearch, setMachineListDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setMachineListDebouncedSearch(machineListSearchTerm);
      setMachineListCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [machineListSearchTerm]);
  
  // Filter machines for modal (only show machines matching the warranty status)
  const modalFilteredMachines = useMachineFilters(machines, {
    debouncedSearch: machineListDebouncedSearch,
    customerFilter: machineListCustomerFilter,
    regionFilter: machineListRegionFilter,
    warrantyFilter: machineListWarrantyFilter
  });
  
  // Pagination for modal
  const machineListTotalPages = Math.ceil(modalFilteredMachines.length / machineListItemsPerPage);
  const machineListPaginatedMachines = useMemo(() => {
    const startIndex = (machineListCurrentPage - 1) * machineListItemsPerPage;
    return modalFilteredMachines.slice(startIndex, startIndex + machineListItemsPerPage);
  }, [modalFilteredMachines, machineListCurrentPage, machineListItemsPerPage]);
  
  // Reset page when filters change
  useEffect(() => {
    setMachineListCurrentPage(1);
  }, [machineListCustomerFilter, machineListRegionFilter, machineListWarrantyFilter, machineListDebouncedSearch]);
  
  // Check if any filter is active
  const hasMachineListActiveFilters = useMemo(() => 
    machineListCustomerFilter || machineListRegionFilter || machineListWarrantyFilter || machineListSearchTerm,
    [machineListCustomerFilter, machineListRegionFilter, machineListWarrantyFilter, machineListSearchTerm]
  );
  
  // Handle export with feedback - defined after modalFilteredMachines
  const handleExportMachines = useCallback(async () => {
    // Safely access modalFilteredMachines
    const machinesToExport = modalFilteredMachines || [];
    
    if (machinesToExport.length === 0) {
      toast.error('Tidak ada data untuk diekspor', {
        icon: '⚠️',
        duration: 3000
      });
      return;
    }
    
    setIsExporting(true);
    try {
      const fileName = machineListWarrantyFilter === "On Warranty" 
        ? "on_warranty" 
        : machineListWarrantyFilter === "Out Of Warranty"
        ? "expired"
        : "all";
      
      const result = exportMachinesToCSV(machinesToExport, fileName);
      
      if (result && result.success) {
        toast.success(
          `Berhasil mengekspor ${result.count?.toLocaleString() || machinesToExport.length} mesin ke ${result.fileName}`,
          {
            icon: '✅',
            duration: 4000
          }
        );
      } else {
        toast.error(result?.error || 'Gagal mengekspor data', {
          icon: '❌',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Terjadi kesalahan saat mengekspor data', {
        icon: '❌',
        duration: 4000
      });
    } finally {
      setIsExporting(false);
    }
  }, [modalFilteredMachines, machineListWarrantyFilter]);
  
  // Defer filter value to reduce re-renders during typing
  const deferredFilterValue = useDeferredValue(filterValue);
  
  // Fetch monthly machine data from API
  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoadingMonthly(true);
        
        // Fetch data from API
        const response = await fetch('/api/monthly-machines');
        
        if (response.ok) {
          const result = await response.json();
          setMonthlyMachineData(result.rows || []);
        } else {
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Dashboard] Monthly machine data not available');
          }
          setMonthlyMachineData([]);
        }
      } catch (error) {
        // Only log errors, not debug info
        console.error('[Dashboard] Error fetching monthly machine data:', error);
        setMonthlyMachineData([]);
      } finally {
        setLoadingMonthly(false);
      }
    };
    
    fetchMonthlyData();
  }, []);
  
  // ============================================================================
  // FILTER OPTIONS - Generate dropdown options berdasarkan category
  // ============================================================================
  
  /**
   * options - Dropdown options untuk filter
   * 
   * Menghasilkan array of options berdasarkan category yang dipilih:
   * - REGION: Fixed list ["Region 1", "Region 2", "Region 3"]
   * - VENDOR: Unique vendor list dari engineers
   * - AREA GROUP: Normalized area groups dari engineers + machines
   * 
   * @dependencies [engineers, machines, category]
   */
  const options = useMemo(() => {
    // Ensure engineers and machines are arrays
    const engineersArray = Array.isArray(engineers) ? engineers : [];
    const machinesArray = Array.isArray(machines) ? machines : [];
    let options = [];
    
    if (category === "REGION") {
      // Hanya tampilkan Region 1, 2, dan 3
      options = ["Region 1", "Region 2", "Region 3"];
    } else if (category === "VENDOR") {
      // Hanya ambil dari engineers, bukan dari customer machines
      const engineerVendors = engineersArray
        .filter((r) => r && typeof r === 'object')
        .map((r) => r.vendor)
        .filter((val) => val && typeof val === 'string');
      options = engineerVendors;
    } else if (category === "AREA GROUP") {
      const engineerAreaGroups = engineersArray
        .filter((r) => r && typeof r === 'object')
        .map((r) => r.area_group)
        .filter((val) => val && typeof val === 'string');
      const machineAreaGroups = machinesArray
        .filter((r) => r && typeof r === 'object')
        .map((r) => r.area_group)
        .filter((val) => val && typeof val === 'string');
      options = [...engineerAreaGroups, ...machineAreaGroups];
      
      // Normalisasi area group names
      const normalizedMap = new Map();
      options.forEach(opt => {
        if (opt && typeof opt === 'string') {
          try {
            const normalized = normalizeText(opt);
            if (normalized && !normalizedMap.has(normalized)) {
              normalizedMap.set(normalized, toTitleCase(normalized));
            }
          } catch (error) {
            // Skip invalid options
            console.warn('Error normalizing option:', opt, error);
          }
        }
      });
      
      options = Array.from(normalizedMap.values()).filter(Boolean);
    }
    
    const uniqueOptions = [...new Set(options)].filter((opt) => opt && typeof opt === 'string');
    
    return uniqueOptions.sort((a, b) => {
      if (category === "REGION") {
        const regionOrder = ["Region 1", "Region 2", "Region 3"];
        const aIndex = regionOrder.indexOf(a);
        const bIndex = regionOrder.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
      }
      if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
      }
      return 0;
    });
  }, [engineers, machines, category]);
  
  // ============================================================================
  // FILTERED DATA - Apply filter logic ke engineers dan machines
  // ============================================================================
  
  /**
   * filteredEngineers - Engineers yang sudah difilter berdasarkan category & filterValue
   * 
   * Logic filtering:
   * - REGION: Exact match di field region
   * - VENDOR: Exact match di field vendor
   * - AREA GROUP: Pattern matching ("Surabaya" match dengan "Surabaya 1", "Surabaya 2")
   * 
   * @dependencies [engineers, category, filterValue]
   */
  const filteredEngineers = useMemo(() => {
    // Ensure engineers is an array
    if (!Array.isArray(engineers)) return [];
    
    // Use deferredFilterValue for heavy calculations to avoid blocking UI
    const activeFilter = deferredFilterValue || filterValue;
    if (!activeFilter) return engineers;
    const key = category === "REGION" ? "region" : category === "VENDOR" ? "vendor" : "area_group";
    
    if (category === "AREA GROUP") {
      // Pattern matching: "Surabaya" akan match dengan "Surabaya 1", "Surabaya 2", dll
      return engineers.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        const rawValue = r[key];
        if (!rawValue || typeof rawValue !== 'string') return false;
        const value = rawValue.toLowerCase().trim().replace(/\s+/g, ' ');
        const filter = activeFilter.toLowerCase().trim();
        // Hapus angka di akhir untuk matching
        const valueBase = value.replace(/\s+\d+$/, '');
        return valueBase === filter;
      });
    }
    
    return engineers.filter((r) => r && typeof r === 'object' && r[key] === activeFilter);
  }, [engineers, category, deferredFilterValue, filterValue]);
  
  /**
   * filteredMachines - Machines yang sudah difilter berdasarkan category & filterValue
   * 
   * Logic filtering:
   * - REGION: Filter berdasarkan region engineer yang terkait atau machine.region
   * - VENDOR: Exact match di field customer
   * - AREA GROUP: Pattern matching seperti engineers
   * 
   * @dependencies [machines, engineers, category, filterValue]
   */
  const filteredMachines = useMemo(() => {
    // Ensure machines is an array
    if (!Array.isArray(machines)) return [];
    // Ensure engineers is an array for region filtering
    const engineersArray = Array.isArray(engineers) ? engineers : [];
    
    // Use deferredFilterValue for heavy calculations to avoid blocking UI
    const activeFilter = deferredFilterValue || filterValue;
    if (!activeFilter) return machines;
    if (category === "REGION") {
      // Filter berdasarkan region engineer yang terkait dengan machine
      // Atau gunakan area_group sebagai proxy untuk region jika tidak ada mapping
      // Asumsi: machines memiliki field region atau kita filter berdasarkan engineer region
      return machines.filter((machine) => {
        if (!machine || typeof machine !== 'object') return false;
        // Cari engineer yang sesuai dengan machine ini
        const relatedEngineer = engineersArray.find(eng => 
          eng && typeof eng === 'object' && (
            eng.area_group === machine.area_group || 
            eng.vendor === machine.customer
          )
        );
        return (relatedEngineer?.region === activeFilter) || (machine.region === activeFilter);
      });
    } else if (category === "VENDOR") {
      return machines.filter((r) => r && typeof r === 'object' && r.customer === activeFilter);
    } else if (category === "AREA GROUP") {
      // Pattern matching: "Surabaya" akan match dengan "Surabaya 1", "Surabaya 2", dll
      return machines.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        const rawValue = r.area_group;
        if (!rawValue || typeof rawValue !== 'string') return false;
        const value = rawValue.toLowerCase().trim().replace(/\s+/g, ' ');
        const filter = activeFilter.toLowerCase().trim();
        // Hapus angka di akhir untuk matching
        const valueBase = value.replace(/\s+\d+$/, '');
        return valueBase === filter;
      });
    }
    return machines;
  }, [machines, engineers, category, deferredFilterValue, filterValue]);
  
  // ============================================================================
  // AGGREGATED DATA - REFACTORED dengan groupByField helper
  // ============================================================================
  
  /**
   * machinesByRegion - REFACTORED dengan groupByField helper
   * 
   * Agregasi jumlah mesin per region (provinsi).
   * Menggunakan helper function groupByField() untuk consistency.
   * 
   * Output format: { "Jawa Timur": 45, "DKI Jakarta": 32, ... }
   */
  const machinesByRegion = useMemo(() => 
    groupByField(machines, 'provinsi', 'Unknown'),
    [machines]
  );
  
  /**
   * engineersByRegion - REFACTORED dengan groupByField helper
   * 
   * Agregasi jumlah engineer per region (Region 1/2/3).
   * Menggunakan helper function groupByField() untuk consistency.
   * 
   * Output format: { "Region 1": 15, "Region 2": 20, ... }
   */
  const engineersByRegion = useMemo(() => 
    groupByField(engineers, 'region', 'Unknown'),
    [engineers]
  );
  
  /**
   * machinesByAreaGroup - REFACTORED dengan groupByNormalizedAreaGroup helper
   * 
   * Agregasi jumlah mesin per area group dengan normalisasi.
   * Menggabungkan area group yang serupa (e.g., "Surabaya 1", "Surabaya 2" -> "Surabaya").
   * 
   * Output format: { "Jakarta Pusat": 12, "Surabaya": 25, ... }
   */
  const machinesByAreaGroup = useMemo(() => 
    groupByNormalizedAreaGroup(machines, 'area_group', normalizeAreaGroup),
    [machines]
  );
  
  /**
   * machinesByVendor - Breakdown mesin per vendor/customer
   */
  const machinesByVendor = useMemo(() => 
    groupByField(machines, 'customer', 'Unknown'),
    [machines]
  );
  
  /**
   * engineersByAreaGroup - Breakdown engineer per area group dengan normalisasi
   * 
   * Menggabungkan area group yang serupa (e.g., "Surabaya 1", "Surabaya 2" -> "Surabaya").
   */
  const engineersByAreaGroup = useMemo(() => 
    groupByNormalizedAreaGroup(engineers, 'area_group', normalizeAreaGroup),
    [engineers]
  );
  
  // ============================================================================
  // KPI METRICS - Calculations untuk KPI cards
  // ============================================================================
  
  /**
   * currentFilter - Label filter yang sedang aktif (untuk subtitle di KPI card)
   * 
   * Menampilkan text yang user-friendly untuk filter yang sedang aktif.
   * Jika tidak ada filter, tampilkan "All [Category]s".
   * 
   * @dependencies [filterValue, category]
   */
  const currentFilter = useMemo(() => 
    filterValue || `All ${category}s`,
    [filterValue, category]
  );
  
  /**
   * currentMachines & currentEngineers - Jumlah data yang terfilter
   * 
   * Angka utama yang ditampilkan di KPI cards.
   * 
   * @dependencies [filteredMachines, filteredEngineers]
   */
  const currentMachines = useMemo(() => filteredMachines.length, [filteredMachines]);
  const currentEngineers = useMemo(() => filteredEngineers.length, [filteredEngineers]);
  
  /**
   * totalMachines & totalEngineers - Total keseluruhan tanpa filter
   * 
   * Digunakan untuk perbandingan di charts (filter vs total).
   * 
   * @dependencies [machines, engineers]
   */
  const totalMachines = useMemo(() => machines.length, [machines]);
  const totalEngineers = useMemo(() => engineers.length, [engineers]);

  // Calculate warranty KPIs
  const warrantyKPIs = useMachineKPIs(filteredMachines, machines);
  const { 
    onWarranty, 
    outOfWarranty, 
    warrantyRemaining 
  } = warrantyKPIs;
  
  const warrantyPercentage = currentMachines > 0 ? (onWarranty / currentMachines * 100) : 0;

  // Stock Parts Data Processing
  const validStockParts = useMemo(() => {
    if (!stockParts || stockParts.length === 0) return [];
    return stockParts.filter(part => {
      const partNumber = part.part_number || part['part number'] || '';
      return partNumber.toLowerCase() !== 'region';
    });
  }, [stockParts]);

  // Stock Alerts KPIs
  const stockKPIs = useStockPartKPIs(validStockParts, validStockParts, fslLocations || []);
  const stockAlerts = stockKPIs?.stockAlerts || {
    criticalCount: 0,
    urgentCount: 0,
    warningCount: 0,
    priorityCriticalCount: 0,
    totalLowStock: 0
  };

  // Calculate detailed warranty insights for modal
  const warrantyInsights = useMemo(() => {
    if (!filteredMachines || filteredMachines.length === 0) return null;

    const calculateRemaining = (year, warrantyPeriodYears = 2) => {
      if (!year) return { days: 0, expired: true, status: 'expired' };
      const installYear = parseInt(year) || new Date().getFullYear();
      const currentDate = new Date();
      const warrantyEndDate = new Date(installYear + warrantyPeriodYears, 11, 31);
      const diffTime = warrantyEndDate - currentDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { days: 0, expired: true, status: 'expired' };
      
      let status = 'good';
      if (diffDays < 90) status = 'critical';
      else if (diffDays < 180) status = 'warning';
      
      return { days: diffDays, expired: false, status, months: Math.floor(diffDays / 30) };
    };

    const machinesOnWarranty = filteredMachines
      .filter(m => m.machine_status === 'On Warranty' || m.machine_status === 'In Warranty')
      .map(m => ({
        ...m,
        warrantyInfo: calculateRemaining(m.year, 2)
      }))
      .filter(m => !m.warrantyInfo.expired);

    const expiringSoonMachines = machinesOnWarranty
      .filter(m => m.warrantyInfo.status === 'critical')
      .sort((a, b) => a.warrantyInfo.days - b.warrantyInfo.days)
      .slice(0, 10);

    const distribution = machinesOnWarranty.reduce((acc, m) => {
      acc[m.warrantyInfo.status] = (acc[m.warrantyInfo.status] || 0) + 1;
      return acc;
    }, { critical: 0, warning: 0, good: 0 });

    const timeRanges = {
      '0-30 hari': machinesOnWarranty.filter(m => m.warrantyInfo.days <= 30).length,
      '31-90 hari': machinesOnWarranty.filter(m => m.warrantyInfo.days > 30 && m.warrantyInfo.days <= 90).length,
      '91-180 hari': machinesOnWarranty.filter(m => m.warrantyInfo.days > 90 && m.warrantyInfo.days <= 180).length,
      '181-365 hari': machinesOnWarranty.filter(m => m.warrantyInfo.days > 180 && m.warrantyInfo.days <= 365).length,
      '> 365 hari': machinesOnWarranty.filter(m => m.warrantyInfo.days > 365).length
    };

    return {
      totalOnWarranty: machinesOnWarranty.length,
      expiringSoonMachines,
      distribution,
      timeRanges,
      avgRemaining: warrantyRemaining
    };
  }, [filteredMachines, warrantyRemaining]);
  
  /**
   * currentRatio - Rasio mesin per engineer
   * 
   * Metrik penting untuk mengukur beban kerja engineer.
   * Formula: Total Mesin / Total Engineer
   * 
   * Interpretasi:
   * - < 60: Good (beban kerja rendah)
   * - 60-70: Moderate (beban kerja normal)
   * - > 70: High (overload, perlu tambah engineer)
   * 
   * @dependencies [currentMachines, currentEngineers]
   */
  const currentRatio = useMemo(() => {
    return currentEngineers > 0 ? currentMachines / currentEngineers : 0;
  }, [currentMachines, currentEngineers]);
  
  /**
   * Efficiency calculations - Status dan styling untuk efficiency KPI
   * 
   * Menghitung status efficiency berdasarkan currentRatio.
   * Menghasilkan text, color, emoji, dan percentage untuk UI.
   * 
   * @dependencies [currentRatio]
   */
  const efficiencyStatus = useMemo(() => {
    if (currentRatio < 60) return 'Good';
    if (currentRatio < 70) return 'Moderate';
    return 'High';
  }, [currentRatio]);
  
  const efficiencyColor = useMemo(() => {
    if (currentRatio < 60) return 'text-green-400';
    if (currentRatio < 70) return 'text-yellow-400';
    return 'text-red-400';
  }, [currentRatio]);
  
  const efficiencyEmoji = useMemo(() => {
    if (currentRatio < 60) return '😊';
    if (currentRatio < 70) return '😐';
    return '😰';
  }, [currentRatio]);
  
  const efficiencyPercentage = useMemo(() => {
    // Efisiensi operasional berdasarkan ratio mesin per engineer
    // Konsep: Efisiensi tinggi = ratio rendah (engineer tidak overload)
    // Optimal ratio = 60 mesin/engineer (dianggap 100% efisiensi)
    // 
    // Formula baru yang lebih masuk akal:
    // - Ratio <= 60: Efisiensi = 100% (optimal, engineer tidak overload)
    // - Ratio 60-70: Efisiensi menurun linear dari 100% ke 85%
    // - Ratio > 70: Efisiensi = (60 / ratio) * 100, dibatasi maksimal 85%
    // 
    // Contoh:
    // - Ratio 30: 100% (sangat efisien, underutilized)
    // - Ratio 60: 100% (optimal)
    // - Ratio 70: 85% (moderate)
    // - Ratio 100: (60/100)*100 = 60%
    // - Ratio 120: (60/120)*100 = 50%
    // - Ratio 299: (60/299)*100 = 20%
    
    if (currentRatio <= 0) return '0%';
    
    const optimalRatio = 60;
    const moderateThreshold = 70;
    
    if (currentRatio <= optimalRatio) {
      // Ratio optimal atau lebih rendah = efisiensi maksimal
      return '100%';
    } else if (currentRatio <= moderateThreshold) {
      // Ratio antara 60-70: efisiensi turun linear dari 100% ke 85%
      // Formula: 100 - ((ratio - 60) / 10) * 15
      const efficiency = 100 - ((currentRatio - optimalRatio) / (moderateThreshold - optimalRatio)) * 15;
      return `${Math.max(85, Math.round(efficiency))}%`;
    } else {
      // Ratio > 70: efisiensi = (60 / ratio) * 100
      // Ini memastikan efisiensi selalu <= 85% untuk ratio > 70
      const efficiency = (optimalRatio / currentRatio) * 100;
      // Batasi maksimal 85% (karena untuk ratio 70 sudah 85%)
      return `${Math.max(0, Math.min(85, Math.round(efficiency)))}%`;
    }
  }, [currentRatio]);
  
  const loadPercentage = useMemo(() => {
    const maxLoad = 70;
    return `${Math.min(100, Math.round((currentRatio / maxLoad) * 100))}%`;
  }, [currentRatio]);
  
  const efficiencyWidth = useMemo(() => {
    // Width untuk progress bar harus sesuai dengan efficiencyPercentage
    // Menggunakan logic yang sama dengan efficiencyPercentage
    
    if (currentRatio <= 0) return '0%';
    
    const optimalRatio = 60;
    const moderateThreshold = 70;
    
    if (currentRatio <= optimalRatio) {
      return '100%';
    } else if (currentRatio <= moderateThreshold) {
      // Linear interpolation: 100 - ((ratio - 60) / 10) * 15
      const efficiency = 100 - ((currentRatio - optimalRatio) / (moderateThreshold - optimalRatio)) * 15;
      return `${Math.max(85, efficiency)}%`;
    } else {
      // Formula: (60 / ratio) * 100, maksimal 85%
      const efficiency = (optimalRatio / currentRatio) * 100;
      return `${Math.max(0, Math.min(85, efficiency))}%`;
    }
  }, [currentRatio]);
  
  const loadWidth = useMemo(() => {
    const maxLoad = 70;
    return `${Math.min(100, (currentRatio / maxLoad) * 100)}%`;
  }, [currentRatio]);
  
  // ============================================================================
  // CHART DATA - REFACTORED dengan helper functions
  // ============================================================================
  
  /**
   * experienceData - REFACTORED dengan categorizeByRange helper
   * 
   * Data distribusi pengalaman engineer untuk bar chart.
   * Menggunakan helper function categorizeByRange() untuk consistency.
   */
  const experienceData = useMemo(() => {
    // Define experience range configuration
    const expRanges = [
      { max: 2, label: '0-2 years' },
      { max: 5, label: '3-5 years' },
      { max: 10, label: '6-10 years' }
    ];
    const defaultLabel = '10+ years';
    
    // Initialize buckets
    const experienceGroups = {};
    expRanges.forEach(range => experienceGroups[range.label] = 0);
    experienceGroups[defaultLabel] = 0;
    
    // Categorize engineers menggunakan helper function
    filteredEngineers.forEach(engineer => {
      const experience = engineer.experience || 0;
      const category = categorizeByRange(experience, expRanges, defaultLabel);
      experienceGroups[category]++;
    });
    
    // Convert ke format chart
    return objectToChartData(experienceGroups, 'range', 'count');
  }, [filteredEngineers]);
  
  /**
   * skillsData - Agregasi skills dari engineers
   * 
   * Menghitung jumlah engineer per skill untuk top skills chart.
   * Sort descending untuk menampilkan skills yang paling populer.
   * 
   * @dependencies [filteredEngineers]
   */
  const skillsData = useMemo(() => {
    const skillCounts = {};
    
    filteredEngineers.forEach(engineer => {
      const skills = engineer.skills || [];
      skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    
    // Convert ke format chart dan sort by count
    return Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 skills
  }, [filteredEngineers]);
  
  /**
   * trainingData - REFACTORED dengan objectToChartData helper
   * 
   * Data status training engineer untuk pie chart.
   */
  const trainingData = useMemo(() => {
    // Initialize training status counters
    const trainingStatus = {
      'Completed': 0,
      'In Progress': 0,
      'Not Started': 0
    };
    
    // Count engineers per status
    filteredEngineers.forEach(engineer => {
      const status = engineer.training_status || 'Not Started';
      if (trainingStatus.hasOwnProperty(status)) {
        trainingStatus[status]++;
      }
    });
    
    // Convert ke format chart menggunakan helper
    return objectToChartData(trainingStatus, 'name', 'value');
  }, [filteredEngineers]);
  
  /**
   * warrantyData - REFACTORED dengan objectToChartData helper
   * 
   * Data status garansi mesin untuk pie chart.
   */
  const warrantyData = useMemo(() => {
    // Initialize warranty status counters
    const statusCounts = {
      'In Warranty': 0,
      'Out Of Warranty': 0
    };
    
    // Count machines by warranty status
    filteredMachines.forEach(machine => {
      const status = machine.machine_status || 'Unknown';
      
      // Hanya proses yang ada kata 'Warranty'
      if (status.includes('Warranty')) {
        if (status === 'Out Of Warranty') {
          statusCounts['Out Of Warranty']++;
        } else {
          statusCounts['In Warranty']++;
        }
      }
    });
    
    // Convert ke format chart menggunakan helper
    return objectToChartData(statusCounts, 'name', 'value');
  }, [filteredMachines]);
  
  /**
   * monthlyActivationData - Process data aktivasi mesin per bulan dari API
   * 
   * Format expected dari API: { month: "Jan", year: 2024, total_activation: 5 }
   * Convert to chart format: { month: "Jan 2024", count: 5 }
   * 
   * OPTIMIZED: Limit data points to improve chart rendering performance
   */
  const monthlyActivationData = useMemo(() => {
    if (!monthlyMachineData || monthlyMachineData.length === 0) return [];
    
    const rawData = monthlyMachineData.map(item => {
      // Format bulan dan tahun
      const month = item.month || item.bulan || '';
      const year = item.year || (new Date().getFullYear()); // Default tahun sekarang
      
      // Format jumlah aktivasi
      const count = item.total_activation || item.total_aktifasi || item.jumlah || item.count || 0;
      
      return {
        month: `${month} ${year}`,
        count: parseInt(count)
      };
    });
    
    // Limit to 36 points (3 years of monthly data) to reduce rendering overhead
    return limitChartData(rawData, 36, 'sample');
  }, [monthlyMachineData]);
  
  /**
   * formatPercentage - Format percentage number to readable string
   * Examples: 238600 -> "238,600%", 1234.5 -> "1,235%", 99.9 -> "99.9%"
   */
  const formatPercentage = useCallback((value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0%';
    
    // If value is very large (>= 1000), use comma separator and round to integer
    if (Math.abs(num) >= 1000) {
      const rounded = Math.round(num);
      // Use toLocaleString with 'en-US' for comma separator (238,600)
      return `${rounded.toLocaleString('en-US')}%`;
    }
    
    // For numbers >= 100, round to integer
    if (Math.abs(num) >= 100) {
      return `${Math.round(num)}%`;
    }
    
    // For numbers < 100, show one decimal place
    return `${num.toFixed(1)}%`;
  }, []);

  /**
   * monthlyActivationInsights - Calculate insights from monthly activation data
   */
  const monthlyActivationInsights = useMemo(() => {
    if (!monthlyActivationData || monthlyActivationData.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: { month: '-', count: 0 },
        lowest: { month: '-', count: 0 },
        growthRate: 0,
        growthRateFormatted: '0%',
        recentTrend: 'stable'
      };
    }
    
    const total = monthlyActivationData[monthlyActivationData.length - 1]?.count || 0;
    const average = Math.round(monthlyActivationData.reduce((sum, item) => sum + item.count, 0) / monthlyActivationData.length);
    
    // Find highest and lowest
    const highest = monthlyActivationData.reduce((max, item) => item.count > max.count ? item : max, monthlyActivationData[0]);
    const lowest = monthlyActivationData.reduce((min, item) => item.count < min.count ? item : min, monthlyActivationData[0]);
    
    // Calculate growth rate (comparing first and last data point)
    const firstValue = monthlyActivationData[0]?.count || 1;
    const lastValue = monthlyActivationData[monthlyActivationData.length - 1]?.count || 0;
    const growthRate = (lastValue - firstValue) / firstValue * 100;
    const growthRateFormatted = formatPercentage(growthRate);
    
    // Determine recent trend (last 6 months)
    const recentData = monthlyActivationData.slice(-6);
    const recentAvg = recentData.reduce((sum, item) => sum + item.count, 0) / recentData.length;
    const previousAvg = monthlyActivationData.slice(-12, -6).reduce((sum, item) => sum + item.count, 0) / 6;
    const recentTrend = recentAvg > previousAvg * 1.05 ? 'growing' : recentAvg < previousAvg * 0.95 ? 'declining' : 'stable';
    
    return {
      total,
      average,
      highest,
      lowest,
      growthRate,
      growthRateFormatted,
      recentTrend
    };
  }, [monthlyActivationData, formatPercentage]);
  
  /**
   * machineAgeData - REFACTORED dengan helper functions
   * 
   * Data distribusi usia mesin untuk bar chart.
   * Menggunakan parseInstallYear, calculateMachineAge, categorizeByRange helpers.
   */
  const machineAgeData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    // Define age range configuration
    const ageRanges = [
      { max: 2, label: '0-2 years' },
      { max: 5, label: '3-5 years' },
      { max: 10, label: '6-10 years' },
      { max: 15, label: '11-15 years' }
    ];
    const defaultLabel = '15+ years';
    
    // Initialize age buckets
    const ageGroups = {};
    ageRanges.forEach(range => ageGroups[range.label] = 0);
    ageGroups[defaultLabel] = 0;
    
    // Process machines menggunakan helper functions
    filteredMachines.forEach(machine => {
      const age = calculateMachineAge(machine, currentYear);
      
      if (age !== null && age >= 0) {
        const category = categorizeByRange(age, ageRanges, defaultLabel);
        ageGroups[category]++;
      }
    });
    
    // Convert ke format chart
    return objectToChartData(ageGroups, 'range', 'count');
  }, [filteredMachines]);
  
  /**
   * installYearData - REFACTORED dengan helper functions
   * 
   * Data trend instalasi mesin per tahun untuk line chart.
   * Menggunakan parseInstallYear dan objectToChartData helpers.
   */
  const installYearData = useMemo(() => {
    const yearCounts = {};
    const currentYear = new Date().getFullYear();
    
    // Process machines menggunakan parseInstallYear helper
    filteredMachines.forEach(machine => {
      const year = parseInstallYear(machine);
      
      if (year) {
        const yearInt = parseInt(year);
        // Hanya hitung tahun yang reasonable (last 20 years)
        if (yearInt >= currentYear - 20 && yearInt <= currentYear) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      }
    });
    
    // Convert ke format chart dan sort by year
    const chartData = objectToChartData(yearCounts, 'year', 'count');
    return chartData.sort((a, b) => a.year - b.year);
  }, [filteredMachines]);
  
  // ============================================================================
  // EVENT HANDLERS - UI interaction handlers
  // ============================================================================
  
  /**
   * handleEngineerClick - Handle click pada engineer item
   * 
   * Navigate ke engineer detail page dengan data engineer.
   * Memoized dengan useCallback untuk menghindari re-renders yang tidak perlu.
   * 
   * @param {Object} engineer - Engineer object yang diklik
   */
  const handleEngineerClick = useCallback((engineer) => {
    navigate('/engineers', { state: { selectedEngineer: engineer } });
  }, [navigate]);
  
  // Memoize topRegions calculation for breakdown chart
  const topRegionsChart = useMemo(() => {
    const topRegions = Object.entries(engineersByRegion)
      .map(([name, value]) => ({ 
        name, 
        value,
        ratio: machinesByRegion?.[name] ? Math.round(machinesByRegion[name] / value) : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    
    if (topRegions.length === 0) {
      return (
        <ResponsiveContainer width="100%" height={50}>
          <BarChart data={[
            { name: 'Filter', value: currentEngineers },
            { name: 'Total', value: totalEngineers }
          ]} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px', padding: '6px 10px' }}
              labelStyle={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ color: '#6ee7b7', fontSize: '11px' }}
              formatter={(value) => [value.toLocaleString(), 'Jumlah']}
            />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} animationDuration={0} />
            <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 10 }} stroke="#64748b" height={20} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={50}>
        <BarChart data={topRegions} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px', padding: '6px 10px' }}
            labelStyle={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
            itemStyle={{ color: '#6ee7b7', fontSize: '11px' }}
            formatter={(value, name) => {
              if (name === 'value') return [value.toLocaleString(), 'Engineer'];
              return [value, 'Rasio'];
            }}
          />
          <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} animationDuration={0}>
            {topRegions.map((entry, index) => {
              const ratio = parseFloat(entry.ratio);
              let color = '#10b981'; // green
              if (ratio > 70) color = '#ef4444'; // red
              else if (ratio > 60) color = '#f59e0b'; // yellow
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#cbd5e1', fontSize: 9 }} 
            stroke="#64748b" 
            height={30}
            angle={-45}
            textAnchor="end"
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }, [engineersByRegion, machinesByRegion, currentEngineers, totalEngineers]);

  // Check if any data is still loading
  const loading = engineersLoading || machinesLoading || stockPartsLoading || fslLoading;

  // Show loading spinner if any data is still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <LoadingSkeleton type="spinner" message="Memuat data dashboard..." size="lg" />
      </div>
    );
  }

  return (
    <PageLayout
      title="ROC Dashboard"
      subtitle="Engineering & Machine Management Overview"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Machines Card */}
        <div className={cn(getKPICard('blue', true), 'min-h-[200px]')}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className={TEXT_STYLES.kpiTitle}>Total Mesin</p>
              <h3 className={TEXT_STYLES.kpiValue}>{currentMachines.toLocaleString()}</h3>
              <p className={TEXT_STYLES.kpiSubtitle}>{filterValue || `Semua ${category}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl">🖥️</div>
              <button
                onClick={() => setFullscreenChart('total-machines')}
                className="text-slate-400 hover:text-blue-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-blue-600/20 hover:bg-blue-600/30"
                title="Lihat Insight Detail"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>
          {/* Warranty Status Breakdown */}
          <div className="mt-4 space-y-3">
            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${warrantyPercentage}%` }}
              ></div>
              <div 
                className="absolute top-0 right-0 h-full bg-gradient-to-r from-red-500/80 to-red-400/80 transition-all duration-500"
                style={{ width: `${100 - warrantyPercentage}%` }}
              ></div>
            </div>
            
            {/* Warranty Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* On Warranty - Clickable Button */}
              <button
                onClick={() => {
                  setMachineListWarrantyFilter("On Warranty");
                  setShowMachineListModal(true);
                }}
                className="bg-green-500/10 rounded-lg p-2.5 hover:bg-green-500/20 transition-all cursor-pointer focus:outline-none focus:ring-0 border-0 text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-400 text-lg">✅</span>
                  <span className="text-xs text-green-300 font-semibold">On Warranty</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-green-400">{onWarranty.toLocaleString()}</span>
                  <span className="text-xs text-green-300/70">({warrantyPercentage.toFixed(1)}%)</span>
                </div>
              </button>
              
              {/* Out of Warranty - Clickable Button */}
              <button
                onClick={() => {
                  setMachineListWarrantyFilter("Out Of Warranty");
                  setShowMachineListModal(true);
                }}
                className="bg-red-500/10 rounded-lg p-2.5 hover:bg-red-500/20 transition-all cursor-pointer focus:outline-none focus:ring-0 border-0 text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <span className="text-xs text-red-300 font-semibold">Expired</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-red-400">{outOfWarranty.toLocaleString()}</span>
                  <span className="text-xs text-red-300/70">({(100 - warrantyPercentage).toFixed(1)}%)</span>
                </div>
              </button>
            </div>
            
            {/* Quick Summary */}
            <div className="pt-2 border-t border-slate-700/50">
              <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <span>Coverage Rate</span>
                <span className={cn(
                  "font-semibold",
                  warrantyPercentage >= 50 ? "text-green-400" : warrantyPercentage >= 30 ? "text-yellow-400" : "text-red-400"
                )}>{warrantyPercentage.toFixed(1)}%</span>
              </div>
              {warrantyRemaining && warrantyRemaining.avgMonths > 0 && (
                <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'} mt-1`}>
                  <span>Avg. Remaining</span>
                  <span className="text-blue-400 font-semibold">{warrantyRemaining.avgMonths} bulan</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Total Engineers Card */}
        <div className={cn(getKPICard('green', true), 'min-h-[200px]')}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className={TEXT_STYLES.kpiTitle}>Total Engineer</p>
              <h3 className={TEXT_STYLES.kpiValue}>{currentEngineers.toLocaleString()}</h3>
              <p className={TEXT_STYLES.kpiSubtitle}>{filterValue || `Semua ${category}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl">👨‍💼</div>
              <button
                onClick={() => setFullscreenChart('total-engineers')}
                className="text-slate-400 hover:text-green-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-green-600/20 hover:bg-green-600/30"
                title="Lihat Insight Detail"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {/* Comparison Info */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Filter: {currentEngineers.toLocaleString()}</span>
              <span className="text-slate-500">Total: {totalEngineers.toLocaleString()}</span>
              <span className="text-green-400 font-semibold">
                {totalEngineers > 0 ? ((currentEngineers / totalEngineers) * 100).toFixed(1) : 0}%
              </span>
            </div>
            
            {/* Ratio Info */}
            {currentEngineers > 0 && (
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-400">Rasio:</span>
                <span className={`font-semibold ${
                  (currentMachines / currentEngineers) < 60 ? 'text-green-400' : 
                  (currentMachines / currentEngineers) < 70 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {Math.round(currentMachines / currentEngineers)} mesin/engineer
                </span>
              </div>
            )}
            
            {/* Breakdown Chart - Top 3 Regions */}
            {topRegionsChart}
          </div>
        </div>
        
        {/* Machine/Engineer Ratio Card */}
        <div className={cn(getKPICard('purple', true), 'min-h-[200px]')}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className={TEXT_STYLES.kpiTitle}>Rasio Mesin/Engineer</p>
              <h3 className={TEXT_STYLES.kpiValue}>{Math.round(currentRatio)}</h3>
              <p className={TEXT_STYLES.kpiSubtitle}>Mesin per engineer</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl">⚙️</div>
              <button
                onClick={() => setFullscreenChart('machine-ratio')}
                className="text-slate-400 hover:text-purple-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-purple-600/20 hover:bg-purple-600/30"
                title="Lihat Insight Detail"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={95}>
              <LineChart data={[
                { name: 'Opt', value: 60 },
                { name: 'Skrg', value: currentRatio },
                { name: 'Max', value: 70 }
              ]} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '6px 10px' }}
                  labelStyle={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#c4b5fd', fontSize: '11px' }}
                  formatter={(value) => [`${Math.round(value)}`, 'Ratio']}
                />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} dot={false} isAnimationActive={false} animationDuration={0} />
                <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 10 }} stroke="#64748b" height={25} />
                <YAxis tick={{ fill: '#cbd5e1', fontSize: 10 }} stroke="#64748b" domain={[0, 100]} width={35} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Efficiency Status Card */}
        <div className={cn(getKPICard('orange', true), 'min-h-[200px]')}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className={TEXT_STYLES.kpiTitle}>Efisiensi</p>
              <h3 className={cn('text-3xl font-bold', efficiencyColor)}>
                {efficiencyStatus}
              </h3>
              <p className={TEXT_STYLES.kpiSubtitle}>Status beban kerja</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl">
                {efficiencyEmoji}
              </div>
              <button
                onClick={() => setFullscreenChart('efficiency-status')}
                className="text-slate-400 hover:text-orange-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-orange-600/20 hover:bg-orange-600/30"
                title="Lihat Insight Detail"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-200 font-medium">Efisiensi</span>
                <span className={`font-bold ${efficiencyColor}`}>
                  {efficiencyPercentage}
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    currentRatio < 60 ? 'bg-gradient-to-r from-green-400 to-green-300' : 
                    currentRatio < 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-300' : 
                    'bg-gradient-to-r from-red-400 to-red-300'
                  }`}
                  style={{ width: efficiencyWidth }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-200 font-medium">Beban</span>
                <span className="text-slate-200 font-bold">
                  {loadPercentage}
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-slate-400 to-slate-500 transition-all duration-500"
                  style={{ width: loadWidth }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Maps Overlay */}
      {fullscreenChart === "map" && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col overflow-hidden" 
          style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onTouchMove={(e) => {
            // Prevent background scroll on mobile when modal is open
            e.stopPropagation();
          }}
        >
          <div className="flex justify-between items-center p-2 sm:p-4 border-b border-slate-700 flex-shrink-0" style={{ height: 'auto' }}>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-100">Sebaran Service Point HCS-IDN</h2>
            <button 
              onClick={() => setFullscreenChart(null)} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-slate-800"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0, height: 'calc(100vh - 60px)', width: '100%' }}>
            <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: '100%', 
                borderRadius: 0, 
                overflow: 'hidden',
                boxShadow: 'none',
                border: 'none'
              }}>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div></div>}>
                  <MapWithRegions 
                    machines={filteredMachines} 
                    engineers={filteredEngineers}
                    onEngineerClick={handleEngineerClick}
                    isFullscreen={true}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maps Section - Full Width */}
      {fullscreenChart !== "map" && (
      <div className="bg-[var(--card-bg)] p-2 sm:p-4 rounded-lg relative flex flex-col" style={{ minHeight: '400px', height: '400px', maxHeight: '600px' }}>
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <h2 className="text-sm sm:text-lg font-semibold text-slate-100">Sebaran Service Point HCS-IDN</h2>
          <button 
            onClick={() => setFullscreenChart("map")} 
            className="text-slate-400 hover:text-blue-400 transition-colors p-1.5 sm:p-2 rounded hover:bg-slate-700/50 bg-blue-600/20 hover:bg-blue-600/30"
            title="Lihat Insight Detail"
          >
            <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
        
        {/* Simple Compact Filter - Above Map */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 pb-2 border-b border-slate-700/50 flex-shrink-0">
          {/* Compact Filter Tabs */}
          <div className="flex gap-1 sm:gap-2 flex-wrap">
            {[
              { name: "REGION", label: "Region" },
              { name: "VENDOR", label: "Vendor" },
              { name: "AREA GROUP", label: "Area" }
            ].map((tab) => (
              <button
                key={tab.name}
                onClick={() => {
                  startTransition(() => {
                    setCategory(tab.name);
                  });
                }}
                className={`text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded transition-all ${
                  category === tab.name 
                    ? 'bg-blue-600/80 text-white font-semibold' 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/60'
                }`}
                title={tab.label}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 sm:ml-auto">
            <select 
              className="text-xs sm:text-sm bg-slate-800/70 text-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-slate-600/50 focus:outline-none focus:border-blue-400/70 cursor-pointer flex-1 sm:flex-none min-w-0"
              value={filterValue}
              onChange={(e) => {
                const value = e.target.value;
                setFilterValue(value); // Update immediately for UI responsiveness
                // Heavy calculations automatically use deferredFilterValue via useDeferredValue
              }}
            >
              <option value="">All {category}s</option>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {filterValue && (
              <button
                onClick={() => {
                  startTransition(() => {
                    setFilterValue("");
                  });
                }}
                className="text-slate-400 hover:text-red-400 text-sm sm:text-base font-bold px-1.5 sm:px-2 py-1 flex-shrink-0"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* Check if any modal is open */}
        {(() => {
          const isModalOpen = showActivationModal || showWarrantyInsightModal || showExpiringSoonModal || (fullscreenChart && fullscreenChart !== "map");
          return (
            <div 
              style={{ 
                flex: 1, 
                minHeight: '0',
                height: '100%',
                position: 'relative',
                zIndex: isModalOpen ? 1 : 'auto',
                pointerEvents: isModalOpen ? 'none' : 'auto',
                overflow: 'hidden'
              }}
              className={isModalOpen ? 'map-container-modal-open' : ''}
            >
              <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[300px]"><div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div></div>}>
                <MapWithRegions 
                  machines={filteredMachines} 
                  engineers={filteredEngineers}
                  onEngineerClick={handleEngineerClick}
                />
              </Suspense>
            </div>
          );
        })()}
      </div>
      )}

      {/* Training Progress & Coverage Garansi - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Training Skill Progress - Modern Design */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-xl border border-slate-700/50 relative min-h-[400px] max-h-[500px] flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-100 mb-1">Training Skill Progress</h2>
              <p className="text-xs text-slate-400">{filteredEngineers.length} engineers</p>
            </div>
            <button 
              onClick={() => setFullscreenChart("training-skills")} 
              className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-slate-700/50 hover:border-blue-500/30 transition-all"
              title="Lihat Detail Fullscreen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
          {!fullscreenChart && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
              {filteredEngineers.length > 0 ? (
                filteredEngineers.map((engineer, idx) => (
                  <Suspense key={idx} fallback={<div className="h-24 bg-slate-800/30 rounded-xl animate-pulse" />}>
                    <SkillProgress engineer={engineer} />
                  </Suspense>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <div className="w-16 h-16 rounded-full bg-slate-700/30 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">No engineers data available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coverage Garansi Card */}
        <div className={cn(getKPICard('green', true), 'min-h-[400px] max-h-[500px] flex flex-col overflow-hidden')}>
          <div className="flex items-start justify-between mb-4 flex-shrink-0">
            <div className="flex-1">
              <p className={TEXT_STYLES.kpiTitle}>Coverage Garansi</p>
              <h3 className={TEXT_STYLES.kpiValue}>{warrantyPercentage.toFixed(1)}%</h3>
              <p className={TEXT_STYLES.kpiSubtitle}>{filterValue || `Semua ${category}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('Opening Warranty Insight Modal...');
                  console.log('warrantyInsights:', warrantyInsights);
                  setShowWarrantyInsightModal(true);
                }}
                className="text-slate-400 hover:text-green-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-green-600/20 hover:bg-green-600/30"
                title="Lihat Insight Detail"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Progress Bar dengan Breakdown */}
          <div className="mt-4 flex-shrink-0">
            <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${warrantyPercentage}%` }}
              ></div>
              <div 
                className="absolute top-0 right-0 h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                style={{ width: `${100 - warrantyPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-green-400 font-semibold">{onWarranty.toLocaleString()} aktif</span>
                <span className="text-slate-500">({warrantyPercentage.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-red-400 font-semibold">{outOfWarranty.toLocaleString()} expired</span>
                <span className="text-slate-500">({(100 - warrantyPercentage).toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Status Breakdown dengan Visualisasi */}
          {warrantyRemaining && warrantyRemaining.avgDays > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Grid Layout untuk Status */}
              <div className="grid grid-cols-2 gap-3 mb-3 flex-shrink-0">
                {/* Rata-rata Sisa */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⏱️</span>
                    <span className="text-xs text-slate-400">Rata-rata Sisa</span>
                  </div>
                  <div className="text-lg font-bold text-green-400">
                    {warrantyRemaining.avgMonths > 0 
                      ? `${warrantyRemaining.avgMonths} bulan`
                      : `${warrantyRemaining.avgDays} hari`
                    }
                  </div>
                </div>

                {/* Total Aktif */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">Total Aktif</span>
                  </div>
                  <div className="text-lg font-bold text-green-400">
                    {onWarranty.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Top 3 Expiring Soon Machines - Table Format */}
              {warrantyInsights && warrantyInsights.expiringSoonMachines && warrantyInsights.expiringSoonMachines.length > 0 && (
                <div className="mb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <span>⚠️</span> Mesin yang Expiring Soon
                    </div>
                    {warrantyInsights.expiringSoonMachines.length > 3 && (
                      <button
                        onClick={() => setShowExpiringSoonModal(true)}
                        className="text-xs text-green-400 hover:text-green-300 transition-colors font-semibold"
                      >
                        Lihat Detail →
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="text-left py-1 px-2 text-slate-400 font-semibold">#</th>
                          <th className="text-left py-1 px-2 text-slate-400 font-semibold">WSID</th>
                          <th className="text-left py-1 px-2 text-slate-400 font-semibold">Area</th>
                          <th className="text-right py-1 px-2 text-slate-400 font-semibold">Sisa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warrantyInsights.expiringSoonMachines.slice(0, 3).map((machine, idx) => (
                          <tr 
                            key={idx} 
                            className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors last:border-b-0"
                          >
                            <td className="py-1 px-2 text-slate-300 font-mono">{idx + 1}</td>
                            <td className="py-1 px-2">
                              <div className="text-slate-200 font-mono truncate max-w-[120px]" title={machine.wsid || 'Unknown'}>
                                {machine.wsid || 'Unknown'}
                              </div>
                            </td>
                            <td className="py-1 px-2">
                              <div className="text-slate-400 truncate max-w-[100px]" title={machine.area_group || 'Unknown'}>
                                {machine.area_group || 'Unknown'}
                              </div>
                            </td>
                            <td className="py-1 px-2 text-right">
                              <div className={`font-bold ${
                                machine.warrantyInfo.days <= 30 ? 'text-red-400' : 
                                machine.warrantyInfo.days <= 60 ? 'text-orange-400' : 'text-yellow-400'
                              }`}>
                                {machine.warrantyInfo.days} hari
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="mt-auto pt-3 border-t border-slate-700/50 flex-shrink-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-slate-400">
                    Total Mesin: <span className="text-slate-200 font-semibold">{currentMachines.toLocaleString()}</span>
                  </div>
                  <div className="text-slate-400">
                    Coverage: <span className="text-green-400 font-semibold">{warrantyPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Monthly Activation & Machine Age Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {/* Monthly Machine Activation */}
        <div className={cn(getGradientCard('blue', true), 'min-h-[340px]')}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className={TEXT_STYLES.heading4}>Aktivasi Mesin Per Bulan</h2>
              <p className={TEXT_STYLES.mutedSmall}>Trend aktivasi mesin bulanan</p>
            </div>
            <button 
              onClick={() => setShowActivationModal(true)} 
              className="text-slate-400 hover:text-blue-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-blue-600/20 hover:bg-blue-600/30"
              title="Lihat Insight Detail"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
          {loadingMonthly ? (
            <div className="flex items-center justify-center" style={{ height: '220px' }}>
              <div className="text-slate-500">Loading data aktivasi...</div>
            </div>
          ) : monthlyActivationData.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: '220px' }}>
              <div className="text-slate-500">Data aktivasi tidak tersedia</div>
            </div>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyActivationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #3b82f6", borderRadius: "8px", padding: "6px 10px" }}
                    labelStyle={{ color: "#e2e8f0", fontSize: "11px", fontWeight: "bold" }}
                    itemStyle={{ color: "#93c5fd", fontSize: "11px" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={false}
                    isAnimationActive={false}
                    animationDuration={0}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Machine Age Distribution */}
        <div className={cn(getGradientCard('blue', true), 'min-h-[340px]')}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className={TEXT_STYLES.heading4}>Distribusi Usia Mesin</h2>
              <p className={TEXT_STYLES.mutedSmall}>Berdasarkan tahun instalasi</p>
            </div>
            <button 
              onClick={() => setFullscreenChart("machine-age")} 
              className="text-slate-400 hover:text-blue-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-blue-600/20 hover:bg-blue-600/30"
              title="Lihat Insight Detail"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={machineAgeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #3b82f6", borderRadius: "8px", padding: "6px 10px" }}
                  labelStyle={{ color: "#e2e8f0", fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ color: "#93c5fd", fontSize: "11px" }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} isAnimationActive={false} animationDuration={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Installation Year Trend */}
        <div className={cn(getGradientCard('green', true), 'min-h-[340px]')}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className={TEXT_STYLES.heading4}>Trend Instalasi per Tahun</h2>
              <p className={TEXT_STYLES.mutedSmall}>Growth mesin over time</p>
            </div>
            <button 
              onClick={() => setFullscreenChart("install-year")} 
              className="text-slate-400 hover:text-green-400 transition-colors p-2 rounded hover:bg-slate-700/50 bg-green-600/20 hover:bg-green-600/30"
              title="Lihat Insight Detail"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={installYearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #10b981", borderRadius: "8px", padding: "6px 10px" }}
                  labelStyle={{ color: "#e2e8f0", fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ color: "#6ee7b7", fontSize: "11px" }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} animationDuration={0} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== MODAL FULLSCREEN ===== */}
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
        {fullscreenChart && fullscreenChart !== "map" && (
          <FullscreenChartModal
            chartType={fullscreenChart}
            onClose={() => setFullscreenChart(null)}
            filteredMachines={filteredMachines}
        filteredEngineers={filteredEngineers}
        experienceData={experienceData}
        skillsData={skillsData}
        trainingData={trainingData}
        warrantyData={warrantyData}
        machineAgeData={machineAgeData}
        installYearData={installYearData}
        currentMachines={currentMachines}
        currentEngineers={currentEngineers}
        totalMachines={totalMachines}
        totalEngineers={totalEngineers}
        currentRatio={currentRatio}
        efficiencyPercentage={efficiencyPercentage}
        loadPercentage={loadPercentage}
        machinesByRegion={machinesByRegion}
        engineersByRegion={engineersByRegion}
        machinesByAreaGroup={machinesByAreaGroup}
        machinesByVendor={machinesByVendor}
        engineersByAreaGroup={engineersByAreaGroup}
        onEngineerClick={handleEngineerClick}
        warrantyPercentage={warrantyPercentage}
        onWarranty={onWarranty}
        outOfWarranty={outOfWarranty}
        warrantyRemaining={warrantyRemaining}
          />
        )}
      </Suspense>
      
      {/* Modal Insights Aktivasi Mesin */}
      {showActivationModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden" 
          style={{ zIndex: 9999, touchAction: 'none' }}
          onTouchMove={(e) => e.stopPropagation()}
          onClick={() => setShowActivationModal(false)}
        >
          <div 
            className="bg-slate-800 rounded-xl sm:rounded-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-700" 
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 sm:p-6 flex justify-between items-start sm:items-center gap-3 z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-100">📊 Insights Aktivasi Mesin</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Analisis mendalam trend aktivasi mesin dari {monthlyActivationData[0]?.month} hingga {monthlyActivationData[monthlyActivationData.length - 1]?.month}</p>
              </div>
              <button 
                onClick={() => setShowActivationModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 sm:p-2 rounded hover:bg-slate-700/50 flex-shrink-0"
              >
                <X size={18} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className={`bg-gradient-to-br ${isDark ? 'from-blue-500/30 via-blue-400/20 to-indigo-500/30 border-blue-400/40' : 'from-blue-100 via-blue-50 to-indigo-100 border-blue-300'} p-2 sm:p-4 rounded-lg border shadow-lg ${isDark ? 'shadow-blue-500/20' : 'shadow-blue-200'}`}>
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <span className="text-lg sm:text-2xl">🎯</span>
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Total Mesin Aktif</p>
                  </div>
                  <h3 className={`text-xl sm:text-3xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{monthlyActivationInsights.total.toLocaleString()}</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1`}>saat ini</p>
                </div>
                
                <div className={`bg-gradient-to-br ${isDark ? 'from-emerald-500/30 via-green-400/20 to-teal-500/30 border-emerald-400/40' : 'from-emerald-100 via-green-50 to-teal-100 border-emerald-300'} p-4 rounded-lg border shadow-lg ${isDark ? 'shadow-emerald-500/20' : 'shadow-emerald-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📈</span>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Pertumbuhan Total</p>
                  </div>
                  <h3 className={`text-3xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>+{monthlyActivationInsights.growthRateFormatted}</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1`}>sejak awal</p>
                </div>
                
                <div className={`bg-gradient-to-br ${isDark ? 'from-purple-500/30 via-purple-400/20 to-pink-500/30 border-purple-400/40' : 'from-purple-100 via-purple-50 to-pink-100 border-purple-300'} p-4 rounded-lg border shadow-lg ${isDark ? 'shadow-purple-500/20' : 'shadow-purple-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏆</span>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Puncak Tertinggi</p>
                  </div>
                  <h3 className={`text-2xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>{monthlyActivationInsights.highest.count.toLocaleString()}</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1`}>{monthlyActivationInsights.highest.month}</p>
                </div>
                
                <div className={`bg-gradient-to-br ${isDark ? 'from-orange-500/30 via-amber-400/20 to-yellow-500/30 border-orange-400/40' : 'from-orange-100 via-amber-50 to-yellow-100 border-orange-300'} p-4 rounded-lg border shadow-lg ${isDark ? 'shadow-orange-500/20' : 'shadow-orange-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">
                      {monthlyActivationInsights.recentTrend === 'growing' ? '🚀' : monthlyActivationInsights.recentTrend === 'declining' ? '📉' : '➡️'}
                    </span>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Trend Terkini</p>
                  </div>
                  <h3 className={`text-2xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'} capitalize`}>
                    {monthlyActivationInsights.recentTrend === 'growing' ? 'Naik' : monthlyActivationInsights.recentTrend === 'declining' ? 'Turun' : 'Stabil'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1`}>6 bulan terakhir</p>
                </div>
              </div>
              
              {/* Detailed Chart */}
              <div className="bg-slate-900/50 p-3 sm:p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm sm:text-lg font-semibold text-slate-100 mb-3 sm:mb-4">📈 Trend Aktivasi Historis</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyActivationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: "#94a3b8", fontSize: 10 }} 
                      stroke="#64748b"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #3b82f6", borderRadius: "12px" }}
                      labelStyle={{ color: "#e2e8f0", fontWeight: "bold" }}
                      itemStyle={{ color: "#60a5fa" }}
                      formatter={(value) => [value.toLocaleString() + ' mesin', 'Total Aktif']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={false}
                      isAnimationActive={false}
                      animationDuration={0}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Key Insights */}
              <div className="bg-slate-900/50 p-3 sm:p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm sm:text-lg font-semibold text-slate-100 mb-3 sm:mb-4">💡 Key Insights & Rekomendasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex gap-2 sm:gap-3 items-start p-2 sm:p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-lg sm:text-2xl flex-shrink-0">📊</span>
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium text-sm sm:text-base">Pertumbuhan Eksponensial</p>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Total mesin aktif telah tumbuh <strong className="text-green-400">{monthlyActivationInsights.growthRateFormatted}</strong> sejak {monthlyActivationData[0]?.month}, 
                        menunjukkan adopsi yang sangat kuat dan konsisten.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3 items-start p-2 sm:p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-lg sm:text-2xl flex-shrink-0">🎯</span>
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium text-sm sm:text-base">Peak Performance</p>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Aktivasi tertinggi tercatat pada <strong className={isDark ? "text-purple-300" : "text-purple-600"}>{monthlyActivationInsights.highest.month}</strong> dengan 
                        <strong className="text-purple-400"> {monthlyActivationInsights.highest.count.toLocaleString()} mesin</strong> aktif.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3 items-start p-2 sm:p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-lg sm:text-2xl flex-shrink-0">📅</span>
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium text-sm sm:text-base">Maintenance Planning</p>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Dengan {monthlyActivationInsights.total.toLocaleString()} mesin aktif, prioritaskan preventive maintenance schedule 
                        untuk memastikan uptime optimal di semua lokasi.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3 items-start p-2 sm:p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-lg sm:text-2xl flex-shrink-0">
                      {monthlyActivationInsights.recentTrend === 'growing' ? '🚀' : monthlyActivationInsights.recentTrend === 'declining' ? '⚠️' : '➡️'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium text-sm sm:text-base">Trend Analysis</p>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        {monthlyActivationInsights.recentTrend === 'growing' 
                          ? 'Trend aktivasi menunjukkan pertumbuhan positif 6 bulan terakhir. Pastikan resource dan support team mencukupi.'
                          : monthlyActivationInsights.recentTrend === 'declining'
                          ? 'Trend menunjukkan penurunan aktivasi. Review faktor-faktor yang mempengaruhi dan lakukan improvement action.'
                          : 'Trend stabil. Monitor terus untuk memastikan konsistensi operasional dan identifikasi opportunity untuk growth.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Recommendations */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-3 sm:p-4 rounded-lg border border-blue-500/30">
                <h3 className="text-sm sm:text-lg font-semibold text-slate-100 mb-2 sm:mb-3 flex items-center gap-2">
                  <span>🎯</span> Action Items & Next Steps
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span>
                    <span>Lakukan capacity planning berdasarkan trend pertumbuhan untuk antisipasi kebutuhan engineer dan spare parts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span>
                    <span>Analisis pola seasonal untuk optimasi deployment resources di bulan-bulan dengan aktivasi tinggi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span>
                    <span>Setup monitoring dashboard real-time untuk track aktivasi harian dan identify anomali lebih cepat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span>
                    <span>Review historical data untuk understand correlation antara aktivasi mesin dengan faktor eksternal (seasonality, campaign, dll)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Soon Modal - Top 5 */}
      {showExpiringSoonModal && warrantyInsights && warrantyInsights.expiringSoonMachines && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-6 overflow-hidden" 
          style={{ zIndex: 9999, touchAction: 'none' }}
          onTouchMove={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowExpiringSoonModal(false);
            }
          }}
        >
          <div 
            className="bg-slate-900 rounded-xl sm:rounded-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden"
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start sm:items-center p-3 sm:p-6 border-b border-slate-700 flex-shrink-0 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                  <span>⚠️</span> Top 5 Mesin yang Expiring Soon
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Menampilkan 5 dari {warrantyInsights.expiringSoonMachines.length} mesin dengan status critical
                </p>
              </div>
              <button
                onClick={() => setShowExpiringSoonModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 sm:p-2 rounded hover:bg-slate-800 flex-shrink-0"
              >
                <X size={18} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-2 sm:p-6 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold">#</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold">WSID</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold">Nama Mesin</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold hidden sm:table-cell">Area</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold hidden md:table-cell">Customer</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold hidden lg:table-cell">Region</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold">Sisa Hari</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-400 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warrantyInsights.expiringSoonMachines.slice(0, 5).map((machine, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-300 font-bold text-red-400">#{idx + 1}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-200 font-mono">{machine.wsid}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-200 font-semibold">{machine.branch_name || 'Unknown'}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-300 hidden sm:table-cell">{machine.area_group || 'Unknown'}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-300 hidden md:table-cell">{machine.customer || 'Unknown'}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-300 hidden lg:table-cell">{machine.region || 'Unknown'}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                          <div className={`font-bold text-sm sm:text-lg ${
                            machine.warrantyInfo.days <= 30 ? 'text-red-400' : 
                            machine.warrantyInfo.days <= 60 ? 'text-orange-400' : 'text-yellow-400'
                          }`}>
                            {machine.warrantyInfo.days}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {machine.warrantyInfo.months > 0 ? `${machine.warrantyInfo.months} bulan` : '< 1 bulan'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs bg-red-500/20 text-red-400 font-semibold">Critical</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Insight Modal */}
      {showWarrantyInsightModal && warrantyInsights && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-6 overflow-hidden" 
          style={{ zIndex: 9999, touchAction: 'none' }}
          onTouchMove={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowWarrantyInsightModal(false);
            }
          }}
        >
          <div 
            className="bg-slate-900 rounded-xl sm:rounded-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden"
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start sm:items-center p-3 sm:p-6 border-b border-slate-700 flex-shrink-0 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                  <span>📊</span> Insight Detail Warranty
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Analisis lengkap status warranty {warrantyInsights.totalOnWarranty} mesin
                </p>
              </div>
              <button
                onClick={() => setShowWarrantyInsightModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 sm:p-2 rounded hover:bg-slate-800 flex-shrink-0"
              >
                <X size={18} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">Total On Warranty</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-400">{warrantyInsights.totalOnWarranty}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">Rata-rata Sisa</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-400">
                    {warrantyInsights.avgRemaining?.avgMonths > 0 
                      ? `${warrantyInsights.avgRemaining.avgMonths} bulan`
                      : `${warrantyInsights.avgRemaining?.avgDays || 0} hari`
                    }
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-4 border border-red-500/30">
                  <p className="text-slate-400 text-xs mb-1">Expiring Soon</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-400">{warrantyInsights.expiringSoonMachines.length}</p>
                  <p className="text-xs text-slate-500 mt-1">&lt; 90 hari</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-4 border border-yellow-500/30">
                  <p className="text-slate-400 text-xs mb-1">Warning</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-400">{warrantyInsights.distribution.warning || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">90-180 hari</p>
                </div>
              </div>

              {/* Warranty Breakdown Overview */}
              <div className="bg-slate-800/50 rounded-lg p-3 sm:p-6 border border-slate-700">
                <h3 className="text-sm sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4 flex items-center gap-2">
                  <span>📊</span> Warranty Status Overview
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  {/* Progress Bar - Large */}
                  <div className="w-full h-5 sm:h-6 bg-slate-700/50 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 flex items-center justify-center"
                      style={{ width: `${warrantyPercentage}%` }}
                    >
                      {warrantyPercentage >= 20 && (
                        <span className="text-xs font-bold text-white">{warrantyPercentage.toFixed(1)}%</span>
                      )}
                    </div>
                    <div 
                      className="absolute top-0 right-0 h-full bg-gradient-to-r from-red-500/80 to-red-400/80 transition-all duration-500 flex items-center justify-center"
                      style={{ width: `${100 - warrantyPercentage}%` }}
                    >
                      {(100 - warrantyPercentage) >= 20 && (
                        <span className="text-xs font-bold text-white">{(100 - warrantyPercentage).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Warranty Stats Grid - Enhanced */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* On Warranty */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 hover:bg-green-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 text-2xl">✅</span>
                          <span className="text-sm text-green-300 font-semibold">On Warranty</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-green-400">{onWarranty.toLocaleString()}</span>
                          <span className="text-lg text-green-300/70">mesin</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-300/70">Percentage</span>
                          <span className="text-green-400 font-bold">{warrantyPercentage.toFixed(1)}%</span>
                        </div>
                        {warrantyRemaining && warrantyRemaining.avgMonths > 0 && (
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-green-500/20">
                            <span className="text-green-300/70">Avg. Remaining</span>
                            <span className="text-green-400 font-bold">{warrantyRemaining.avgMonths} bulan</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Out of Warranty */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 hover:bg-red-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 text-2xl">⚠️</span>
                          <span className="text-sm text-red-300 font-semibold">Expired</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-red-400">{outOfWarranty.toLocaleString()}</span>
                          <span className="text-lg text-red-300/70">mesin</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-red-300/70">Percentage</span>
                          <span className="text-red-400 font-bold">{(100 - warrantyPercentage).toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-red-500/20">
                          <span className="text-red-300/70">Status</span>
                          <span className={cn(
                            "font-bold",
                            (100 - warrantyPercentage) > 70 ? "text-red-400" : (100 - warrantyPercentage) > 50 ? "text-yellow-400" : "text-green-400"
                          )}>
                            {(100 - warrantyPercentage) > 70 ? "Critical" : (100 - warrantyPercentage) > 50 ? "High" : "Normal"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Stats Summary */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-200">{currentMachines.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-1">Total Mesin</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{onWarranty.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-1">Aktif</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{outOfWarranty.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-1">Expired</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Distribusi Sisa Waktu Warranty</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(warrantyInsights.timeRanges).map(([name, value]) => ({ name, value }))}>
                    <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} animationDuration={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 font-semibold">Critical</span>
                    <span className="text-2xl font-bold text-red-400">{warrantyInsights.distribution.critical || 0}</span>
                  </div>
                  <p className="text-xs text-slate-400">Mesin dengan sisa &lt; 90 hari</p>
                  <div className="mt-2 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500"
                      style={{ width: `${warrantyInsights.totalOnWarranty > 0 ? (warrantyInsights.distribution.critical / warrantyInsights.totalOnWarranty * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-400 font-semibold">Warning</span>
                    <span className="text-2xl font-bold text-yellow-400">{warrantyInsights.distribution.warning || 0}</span>
                  </div>
                  <p className="text-xs text-slate-400">Mesin dengan sisa 90-180 hari</p>
                  <div className="mt-2 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500"
                      style={{ width: `${warrantyInsights.totalOnWarranty > 0 ? (warrantyInsights.distribution.warning / warrantyInsights.totalOnWarranty * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-400 font-semibold">Good</span>
                    <span className="text-2xl font-bold text-green-400">{warrantyInsights.distribution.good || 0}</span>
                  </div>
                  <p className="text-xs text-slate-400">Mesin dengan sisa &gt; 180 hari</p>
                  <div className="mt-2 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ width: `${warrantyInsights.totalOnWarranty > 0 ? (warrantyInsights.distribution.good / warrantyInsights.totalOnWarranty * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Expiring Soon Machines List */}
              {warrantyInsights.expiringSoonMachines.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-3 sm:p-6 border border-slate-700">
                  <h3 className="text-sm sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4 flex items-center gap-2">
                    <span>⚠️</span> Mesin yang Expiring Soon (Top 10)
                  </h3>
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left p-2 text-slate-400">WSID</th>
                          <th className="text-left p-2 text-slate-400">Branch</th>
                          <th className="text-left p-2 text-slate-400 hidden md:table-cell">Customer</th>
                          <th className="text-left p-2 text-slate-400 hidden lg:table-cell">Area</th>
                          <th className="text-right p-2 text-slate-400">Sisa Hari</th>
                          <th className="text-right p-2 text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warrantyInsights.expiringSoonMachines.slice(0, 10).map((machine, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                            <td className="p-2 text-slate-200 font-mono">{machine.wsid}</td>
                            <td className="p-2 text-slate-300">{machine.branch_name || 'Unknown'}</td>
                            <td className="p-2 text-slate-300 hidden md:table-cell">{machine.customer || 'Unknown'}</td>
                            <td className="p-2 text-slate-300 hidden lg:table-cell">{machine.area_group || 'Unknown'}</td>
                            <td className="p-2 text-right">
                              <span className={`font-bold text-sm sm:text-base ${
                                machine.warrantyInfo.days <= 30 ? 'text-red-400' : 
                                machine.warrantyInfo.days <= 60 ? 'text-orange-400' : 'text-yellow-400'
                              }`}>
                                {machine.warrantyInfo.days} hari
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs bg-red-500/20 text-red-400">Critical</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Machine List Modal - Warranty Filter */}
      {showMachineListModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden" 
          style={{ zIndex: 9999, touchAction: 'none' }}
          onTouchMove={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMachineListModal(false);
              handleClearMachineListFilters();
            }
          }}
        >
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 shadow-2xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <span>{machineListWarrantyFilter === "On Warranty" ? "✅" : "⚠️"}</span>
                  <span>{machineListWarrantyFilter === "On Warranty" ? "On Warranty" : "Out Of Warranty"}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  <span className="font-semibold text-slate-300">{modalFilteredMachines.length.toLocaleString()}</span> dari <span className="font-semibold text-slate-300">{machines.length.toLocaleString()}</span> mesin
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handleExportMachines}
                  disabled={modalFilteredMachines.length === 0 || isExporting}
                  className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
                  title={modalFilteredMachines.length === 0 ? "Tidak ada data untuk diekspor" : "Export data ke CSV"}
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} className="sm:w-4 sm:h-4" />
                      <span>Export CSV</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowMachineListModal(false);
                    handleClearMachineListFilters();
                  }}
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-500"
                  title="Tutup (ESC)"
                  aria-label="Tutup modal"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="p-3 sm:p-4 border-b border-slate-700 bg-slate-800/50">
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
                <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                  {/* Customer Filter */}
                  <div className="flex-1 min-w-[160px] sm:min-w-[180px]">
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">👤 Customer</label>
                    <select
                      value={machineListCustomerFilter}
                      onChange={(e) => setMachineListCustomerFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      aria-label="Filter by customer"
                    >
                      <option value="">-- Semua Customer --</option>
                      {[...new Set(machines.map(m => m.customer).filter(Boolean))].sort().map(customer => (
                        <option key={customer} value={customer}>{customer}</option>
                      ))}
                    </select>
                  </div>

                  {/* Region Filter */}
                  <div className="flex-1 min-w-[160px] sm:min-w-[180px]">
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">📍 Region</label>
                    <select
                      value={machineListRegionFilter}
                      onChange={(e) => setMachineListRegionFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      aria-label="Filter by region"
                    >
                      <option value="">-- Semua Region --</option>
                      {[...new Set(machines.map(m => m.region).filter(Boolean))].sort().map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search Bar */}
                  <div className="flex-1 min-w-[180px] sm:min-w-[200px]">
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">🔍 Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      <input
                        type="text"
                        placeholder="Cari WSID, Branch, Customer..."
                        value={machineListSearchTerm}
                        onChange={(e) => setMachineListSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        aria-label="Search machines"
                      />
                    </div>
                  </div>

                  {/* Active Filters Info & Clear Button */}
                  <div className="flex items-center gap-2">
                    {hasMachineListActiveFilters && (
                      <>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/20 text-blue-400 rounded text-xs whitespace-nowrap">
                          <span>{modalFilteredMachines.length}</span>
                          <span className="text-slate-400">hasil</span>
                        </div>
                        <button
                          onClick={handleClearMachineListFilters}
                          className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors rounded hover:bg-slate-700/50 flex items-center gap-1"
                          title="Hapus semua filter"
                        >
                          <X size={14} />
                          <span className="hidden sm:inline">Clear</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Active Filter Chips */}
                {hasMachineListActiveFilters && (
                  <div className="flex flex-wrap gap-1.5 items-center mt-2.5 pt-2.5 border-t border-slate-700/50">
                    {machineListWarrantyFilter && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                        <span>⚠️ {machineListWarrantyFilter === "On Warranty" ? "Aktif" : "Expired"}</span>
                        <button
                          onClick={() => {
                            setMachineListWarrantyFilter("");
                            if (!machineListCustomerFilter && !machineListRegionFilter && !machineListSearchTerm) {
                              setShowMachineListModal(false);
                            }
                          }}
                          className="hover:text-green-300 transition-colors ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                    {machineListCustomerFilter && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                        <span className="truncate max-w-[120px]">
                          👤 {machineListCustomerFilter.length > 15 ? machineListCustomerFilter.substring(0, 15) + "..." : machineListCustomerFilter}
                        </span>
                        <button
                          onClick={() => setMachineListCustomerFilter("")}
                          className="hover:text-blue-300 transition-colors ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                    {machineListRegionFilter && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                        <span className="truncate max-w-[120px]">
                          📍 {machineListRegionFilter.length > 15 ? machineListRegionFilter.substring(0, 15) + "..." : machineListRegionFilter}
                        </span>
                        <button
                          onClick={() => setMachineListRegionFilter("")}
                          className="hover:text-blue-300 transition-colors ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                    {machineListSearchTerm && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                        <Search size={10} className="inline" />
                        <span className="truncate max-w-[100px]">"{machineListSearchTerm}"</span>
                        <button
                          onClick={() => setMachineListSearchTerm("")}
                          className="hover:text-purple-300 transition-colors ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-800">
              <div className="flex-1 overflow-auto">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
                      <tr>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">WSID</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">Branch</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">Customer</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">Region</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">Area Group</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">City</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">Type</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {machineListPaginatedMachines.length > 0 ? (
                        machineListPaginatedMachines.map((machine, idx) => (
                          <tr 
                            key={idx} 
                            className={`hover:bg-slate-700/40 transition-colors ${
                              idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/30'
                            }`}
                          >
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-100 font-mono">{machine.wsid || '-'}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-300">{machine.branch_name || '-'}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-300">{machine.customer || '-'}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-300">{machine.region || '-'}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-300">{machine.area_group || '-'}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-300">{machine.city || '-'}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-300">{machine.machine_type || '-'}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 text-xs rounded font-medium ${
                                machine.machine_status === "On Warranty" || machine.machine_status === "In Warranty"
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {machine.machine_status === "On Warranty" || machine.machine_status === "In Warranty" ? '✅' : '⚠️'} {machine.machine_status || '-'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="text-5xl">📭</div>
                              <div>
                                <p className="text-sm font-semibold text-slate-200 mb-1">Tidak ada mesin ditemukan</p>
                                <p className="text-xs text-slate-400">Coba ubah filter atau hapus beberapa filter untuk melihat hasil</p>
                              </div>
                              {hasMachineListActiveFilters && (
                                <button
                                  onClick={handleClearMachineListFilters}
                                  className="mt-2 px-4 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                >
                                  Hapus Semua Filter
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {machineListTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
                  <div className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                    Menampilkan <span className="font-semibold text-slate-300">{((machineListCurrentPage - 1) * machineListItemsPerPage) + 1}</span> - <span className="font-semibold text-slate-300">{Math.min(machineListCurrentPage * machineListItemsPerPage, modalFilteredMachines.length)}</span> dari <span className="font-semibold text-slate-300">{modalFilteredMachines.length.toLocaleString()}</span> mesin
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMachineListCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={machineListCurrentPage === 1}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} className="text-slate-300" />
                    </button>
                    <span className="text-xs sm:text-sm text-slate-300 px-2">
                      Halaman {machineListCurrentPage} dari {machineListTotalPages}
                    </span>
                    <button
                      onClick={() => setMachineListCurrentPage(prev => Math.min(machineListTotalPages, prev + 1))}
                      disabled={machineListCurrentPage === machineListTotalPages}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
