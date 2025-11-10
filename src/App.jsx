import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import _ from 'lodash';

// Sample CSV data structures
const sampleDeals = `deal_id,deal_name,acquisition_date,total_units,purchase_price,renovation_budget,market_value,debt_amount,status,property_type,location
D001,Sunset Apartments,2024-01-15,48,2400000,300000,3200000,1800000,Active,Multifamily,Austin
D002,Harbor View,2024-03-20,72,4200000,450000,5500000,3000000,Active,Multifamily,Miami
D003,Green Valley,2023-11-10,36,1800000,200000,2400000,1300000,Closed,Multifamily,Denver`;

const sampleUnits = `unit_id,deal_id,unit_number,bedrooms,bathrooms,sq_ft,current_rent,market_rent,occupancy_status
U001,D001,101,1,1,650,1200,1300,Occupied
U002,D001,102,2,2,900,1600,1700,Occupied
U003,D001,103,1,1,650,1200,1300,Vacant
U004,D002,201,2,1,850,1500,1650,Occupied
U005,D002,202,3,2,1200,2200,2400,Occupied
U006,D003,301,1,1,600,1100,1250,Occupied`;

const sampleFinancials = `financial_id,deal_id,period,gross_rent,operating_expenses,noi,capex,debt_service
F001,D001,2024-Q1,57600,18500,39100,8000,22500
F002,D001,2024-Q2,58200,19000,39200,7500,22500
F003,D002,2024-Q1,108000,35000,73000,15000,37500
F004,D003,2023-Q4,39600,13500,26100,5000,16250`;

// Utility functions
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);
};

const formatPercent = (value) => {
  return `${((value || 0) * 100).toFixed(1)}%`;
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// KPI Calculations
const calculateKPIs = (deals, units, financials) => {
  const totalDeals = deals.length;
  const totalUnits = _.sumBy(deals, 'total_units') || 0;
  const totalValue = _.sumBy(deals, 'market_value') || 0;
  const totalEquity = _.sumBy(deals, d => (d.market_value || 0) - (d.debt_amount || 0));
  
  const occupiedUnits = units.filter(u => u.occupancy_status === 'Occupied').length;
  const occupancyRate = units.length > 0 ? occupiedUnits / units.length : 0;
  
  const totalNOI = _.sumBy(financials, 'noi') || 0;
  const avgCapRate = totalValue > 0 ? (totalNOI * 4) / totalValue : 0;

  return {
    totalDeals,
    totalUnits,
    totalValue,
    totalEquity,
    occupancyRate,
    avgCapRate
  };
};

export default function App() {
  const [deals, setDeals] = useState([]);
  const [units, setUnits] = useState([]);
  const [financials, setFinancials] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    propertyType: 'all',
    location: 'all'
  });
  const [currentPage, setCurrentPage] = useState('overview');
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    Papa.parse(sampleDeals, {
      header: true,
      dynamicTyping: true,
      complete: (result) => setDeals(result.data.filter(r => r.deal_id))
    });
    Papa.parse(sampleUnits, {
      header: true,
      dynamicTyping: true,
      complete: (result) => setUnits(result.data.filter(r => r.unit_id))
    });
    Papa.parse(sampleFinancials, {
      header: true,
      dynamicTyping: true,
      complete: (result) => setFinancials(result.data.filter(r => r.financial_id))
    });
  };
  
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      if (filters.status !== 'all' && deal.status !== filters.status) return false;
      if (filters.propertyType !== 'all' && deal.property_type !== filters.propertyType) return false;
      if (filters.location !== 'all' && deal.location !== filters.location) return false;
      return true;
    });
  }, [deals, filters]);

  const kpis = useMemo(() => 
    calculateKPIs(filteredDeals, units, financials),
    [filteredDeals, units, financials]
  );

  return (
    <div className="min-h-screen bg-yellow-50">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentPage === 'overview' && (
          <OverviewPage 
            deals={filteredDeals} 
            units={units} 
            financials={financials}
            kpis={kpis}
            filters={filters}
            setFilters={setFilters}
            allDeals={deals}
          />
        )}
        
        {currentPage === 'pipeline' && (
          <PipelinePage 
            deals={filteredDeals}
            setSelectedDeal={setSelectedDeal}
            setCurrentPage={setCurrentPage}
          />
        )}
        
        {currentPage === 'deal-detail' && (
          <DealDetailPage 
            deal={selectedDeal}
            units={units.filter(u => u.deal_id === selectedDeal?.deal_id)}
            financials={financials.filter(f => f.deal_id === selectedDeal?.deal_id)}
            setCurrentPage={setCurrentPage}
          />
        )}
        
        {currentPage === 'data' && (
          <DataPage 
            deals={deals}
            units={units}
            financials={financials}
            setDeals={setDeals}
            setUnits={setUnits}
            setFinancials={setFinancials}
            loadSampleData={loadSampleData}
          />
        )}
      </main>
    </div>
  );
}

function Header({ currentPage, setCurrentPage }) {
  const pages = [
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'data', label: 'Data Management' }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Real Estate Portfolio Dashboard</h1>
            <p className="text-xs text-gray-500 mt-1">by Josue Nganmoue</p>
          </div>
          <nav className="flex gap-4">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(page.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === page.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function Filters({ filters, setFilters, deals }) {
  const statuses = ['all', ...new Set(deals.map(d => d.status))];
  const types = ['all', ...new Set(deals.map(d => d.property_type))];
  const locations = ['all', ...new Set(deals.map(d => d.location))];

  return (
    <div className="bg-yellow-600 rounded-lg shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-white">Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-yellow-50 mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full border border-yellow-700 rounded-lg px-3 py-2 bg-yellow-50"
          >
            {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-yellow-50 mb-2">Property Type</label>
          <select
            value={filters.propertyType}
            onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
            className="w-full border border-yellow-700 rounded-lg px-3 py-2 bg-yellow-50"
          >
            {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-yellow-50 mb-2">Location</label>
          <select
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full border border-yellow-700 rounded-lg px-3 py-2 bg-yellow-50"
          >
            {locations.map(l => <option key={l} value={l}>{l === 'all' ? 'All Locations' : l}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function KPICards({ kpis }) {
  const cards = [
    { label: 'Total Deals', value: kpis.totalDeals, format: 'number' },
    { label: 'Total Units', value: kpis.totalUnits, format: 'number' },
    { label: 'Portfolio Value', value: kpis.totalValue, format: 'currency' },
    { label: 'Total Equity', value: kpis.totalEquity, format: 'currency' },
    { label: 'Occupancy Rate', value: kpis.occupancyRate, format: 'percent' },
    { label: 'Avg Cap Rate', value: kpis.avgCapRate, format: 'percent' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-yellow-600 rounded-lg shadow p-6">
          <div className="text-sm font-medium text-yellow-50 mb-2">{card.label}</div>
          <div className="text-2xl font-bold text-white">
            {card.format === 'currency' && formatCurrency(card.value)}
            {card.format === 'percent' && formatPercent(card.value)}
            {card.format === 'number' && (card.value || 0).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewPage({ deals, units, financials, kpis, filters, setFilters, allDeals }) {
  const portfolioData = deals.map(d => ({
    name: d.deal_name,
    value: d.market_value,
    equity: (d.market_value || 0) - (d.debt_amount || 0)
  }));

  const noiData = _.orderBy(financials, 'period').map(f => ({
    period: f.period,
    noi: f.noi,
    cashFlow: f.noi - f.capex - f.debt_service
  }));

  const unitMix = _.chain(units)
    .groupBy('bedrooms')
    .map((unitList, bedrooms) => ({
      name: `${bedrooms}BR`,
      count: unitList.length,
      avgRent: _.meanBy(unitList, 'current_rent')
    }))
    .value();

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div>
      <Filters filters={filters} setFilters={setFilters} deals={allDeals} />
      <KPICards kpis={kpis} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-yellow-600 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Portfolio Value by Deal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={portfolioData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="value" fill="#3B82F6" name="Market Value" />
              <Bar dataKey="equity" fill="#10B981" name="Equity" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-yellow-600 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">NOI & Cash Flow Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={noiData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="noi" stroke="#3B82F6" strokeWidth={2} name="NOI" />
              <Line type="monotone" dataKey="cashFlow" stroke="#10B981" strokeWidth={2} name="Cash Flow" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Unit Mix Distribution</h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={unitMix}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, count }) => `${name}: ${count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {unitMix.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PipelinePage({ deals, setSelectedDeal, setCurrentPage }) {
  const handleViewDetails = (deal) => {
    setSelectedDeal(deal);
    setCurrentPage('deal-detail');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(deals);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Deals');
    XLSX.writeFile(wb, `pipeline_${formatDate(new Date())}.xlsx`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Deal Pipeline</h2>
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deals.map((deal) => (
              <tr key={deal.deal_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{deal.deal_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{deal.location}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{deal.total_units}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(deal.purchase_price)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(deal.market_value)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    deal.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {deal.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => handleViewDetails(deal)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealDetailPage({ deal, units, financials, setCurrentPage }) {
  if (!deal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No deal selected</p>
        <button
          onClick={() => setCurrentPage('pipeline')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Pipeline
        </button>
      </div>
    );
  }

  const totalCost = (deal.purchase_price || 0) + (deal.renovation_budget || 0);
  const equity = (deal.market_value || 0) - (deal.debt_amount || 0);
  const ltv = deal.market_value > 0 ? deal.debt_amount / deal.market_value : 0;
  
  const totalNOI = _.sumBy(financials, 'noi') || 0;
  const capRate = deal.market_value > 0 ? (totalNOI * 4) / deal.market_value : 0;
  
  const occupiedUnits = units.filter(u => u.occupancy_status === 'Occupied').length;
  const occupancyRate = units.length > 0 ? occupiedUnits / units.length : 0;

  const exportToReport = () => {
    const lines = [
      `Deal Analysis: ${deal.deal_name}`,
      `Generated: ${formatDate(new Date())}`,
      '',
      `Location: ${deal.location}`,
      `Property Type: ${deal.property_type}`,
      `Total Units: ${deal.total_units}`,
      '',
      'Financial Metrics:',
      `Purchase Price: ${formatCurrency(deal.purchase_price)}`,
      `Market Value: ${formatCurrency(deal.market_value)}`,
      `Total Equity: ${formatCurrency(equity)}`,
      `LTV: ${formatPercent(ltv)}`,
      `Cap Rate: ${formatPercent(capRate)}`,
      `Occupancy: ${formatPercent(occupancyRate)}`,
      '',
      'Unit Details:',
      ...units.map(u => 
        `${u.unit_number} - ${u.bedrooms}BR/${u.bathrooms}BA - ${u.sq_ft}sqft - Rent: ${formatCurrency(u.current_rent)} - ${u.occupancy_status}`
      )
    ];
    
    const content = lines.join('\\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deal.deal_name}_analysis_${formatDate(new Date())}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage('pipeline')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Pipeline
          </button>
          <h2 className="text-2xl font-bold">{deal.deal_name}</h2>
        </div>
        <button
          onClick={exportToReport}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Cost</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Market Value</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(deal.market_value)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Equity</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(equity)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">LTV Ratio</div>
          <div className="text-2xl font-bold text-gray-900">{formatPercent(ltv)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Cap Rate</div>
          <div className="text-2xl font-bold text-gray-900">{formatPercent(capRate)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Occupancy</div>
          <div className="text-2xl font-bold text-gray-900">{formatPercent(occupancyRate)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Unit Mix</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sq Ft</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Rent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market Rent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upside</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {units.map((unit) => {
                const upside = (unit.market_rent || 0) - (unit.current_rent || 0);
                return (
                  <tr key={unit.unit_id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{unit.unit_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{unit.bedrooms}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{unit.bathrooms}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{unit.sq_ft}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(unit.current_rent)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(unit.market_rent)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={upside > 0 ? 'text-green-600' : 'text-gray-500'}>
                        {formatCurrency(upside)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        unit.occupancy_status === 'Occupied' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {unit.occupancy_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {financials.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Financial Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NOI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CapEx</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Debt Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Flow</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financials.map((fin) => {
                  const cashFlow = (fin.noi || 0) - (fin.capex || 0) - (fin.debt_service || 0);
                  return (
                    <tr key={fin.financial_id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{fin.period}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(fin.gross_rent)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(fin.operating_expenses)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(fin.noi)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(fin.capex)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(fin.debt_service)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={cashFlow > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {formatCurrency(cashFlow)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DataPage({ deals, units, financials, setDeals, setUnits, setFinancials, loadSampleData }) {
  const handleFileUpload = (e, dataType) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cleanData = result.data.filter(row => {
          if (dataType === 'deals') return row.deal_id;
          if (dataType === 'units') return row.unit_id;
          if (dataType === 'financials') return row.financial_id;
          return false;
        });

        if (dataType === 'deals') setDeals(cleanData);
        if (dataType === 'units') setUnits(cleanData);
        if (dataType === 'financials') setFinancials(cleanData);
      }
    });
  };

  const downloadTemplate = (dataType) => {
    let template = '';
    if (dataType === 'deals') {
      template = 'deal_id,deal_name,acquisition_date,total_units,purchase_price,renovation_budget,market_value,debt_amount,status,property_type,location\\n';
    } else if (dataType === 'units') {
      template = 'unit_id,deal_id,unit_number,bedrooms,bathrooms,sq_ft,current_rent,market_rent,occupancy_status\\n';
    } else if (dataType === 'financials') {
      template = 'financial_id,deal_id,period,gross_rent,operating_expenses,noi,capex,debt_service\\n';
    }

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Data Management</h2>
        <button
          onClick={loadSampleData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Reset to Sample Data
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Deals Data ({deals.length} records)</h3>
          <div className="flex gap-4">
            <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Upload Deals CSV
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'deals')}
                className="hidden"
              />
            </label>
            <button
              onClick={() => downloadTemplate('deals')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Download Template
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Units Data ({units.length} records)</h3>
          <div className="flex gap-4">
            <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Upload Units CSV
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'units')}
                className="hidden"
              />
            </label>
            <button
              onClick={() => downloadTemplate('units')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Download Template
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Financials Data ({financials.length} records)</h3>
          <div className="flex gap-4">
            <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Upload Financials CSV
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'financials')}
                className="hidden"
              />
            </label>
            <button
              onClick={() => downloadTemplate('financials')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Download Template
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2 text-blue-900">Data Schema Information</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Deals CSV:</strong> deal_id, deal_name, acquisition_date, total_units, purchase_price, renovation_budget, market_value, debt_amount, status, property_type, location</p>
          <p><strong>Units CSV:</strong> unit_id, deal_id, unit_number, bedrooms, bathrooms, sq_ft, current_rent, market_rent, occupancy_status</p>
          <p><strong>Financials CSV:</strong> financial_id, deal_id, period, gross_rent, operating_expenses, noi, capex, debt_service</p>
        </div>
      </div>
    </div>
  );
}
