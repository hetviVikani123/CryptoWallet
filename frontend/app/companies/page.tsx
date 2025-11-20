"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Star,
  TrendingUp,
  TrendingDown,
  Building2,
  X,
  Heart,
  BarChart3,
} from 'lucide-react';
import Navigation from '@/components/navigation';
import { formatNumber } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Company {
  id: string;
  name: string;
  logo: string;
  category: string;
  rating: number;
  coinValue: number;
  change24h: number;
  marketCap: string;
  description: string;
  chartData: { time: string; value: number }[];
}

// Mock company data
const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'TechCorp Global',
    logo: '🏢',
    category: 'Technology',
    rating: 4.8,
    coinValue: 125.5,
    change24h: 5.2,
    marketCap: '$2.5B',
    description: 'Leading technology company specializing in AI and cloud solutions',
    chartData: [
      { time: '00:00', value: 119 },
      { time: '04:00', value: 121 },
      { time: '08:00', value: 118 },
      { time: '12:00', value: 123 },
      { time: '16:00', value: 125 },
      { time: '20:00', value: 125.5 },
    ],
  },
  {
    id: '2',
    name: 'FinanceHub Inc',
    logo: '💰',
    category: 'Finance',
    rating: 4.6,
    coinValue: 89.3,
    change24h: -2.1,
    marketCap: '$1.8B',
    description: 'Premier financial services platform for modern investors',
    chartData: [
      { time: '00:00', value: 91 },
      { time: '04:00', value: 92 },
      { time: '08:00', value: 90 },
      { time: '12:00', value: 89 },
      { time: '16:00', value: 88 },
      { time: '20:00', value: 89.3 },
    ],
  },
  {
    id: '3',
    name: 'HealthPlus Medical',
    logo: '🏥',
    category: 'Healthcare',
    rating: 4.9,
    coinValue: 210.7,
    change24h: 8.5,
    marketCap: '$3.2B',
    description: 'Revolutionary healthcare technology and medical research',
    chartData: [
      { time: '00:00', value: 194 },
      { time: '04:00', value: 198 },
      { time: '08:00', value: 202 },
      { time: '12:00', value: 206 },
      { time: '16:00', value: 209 },
      { time: '20:00', value: 210.7 },
    ],
  },
  {
    id: '4',
    name: 'EcoEnergy Solutions',
    logo: '⚡',
    category: 'Energy',
    rating: 4.5,
    coinValue: 67.2,
    change24h: 3.8,
    marketCap: '$1.1B',
    description: 'Sustainable energy solutions for a greener future',
    chartData: [
      { time: '00:00', value: 64.5 },
      { time: '04:00', value: 65 },
      { time: '08:00', value: 65.8 },
      { time: '12:00', value: 66.2 },
      { time: '16:00', value: 67 },
      { time: '20:00', value: 67.2 },
    ],
  },
  {
    id: '5',
    name: 'RetailMax Network',
    logo: '🛍️',
    category: 'Retail',
    rating: 4.3,
    coinValue: 45.8,
    change24h: -1.5,
    marketCap: '$850M',
    description: 'Next-generation retail and e-commerce platform',
    chartData: [
      { time: '00:00', value: 46.5 },
      { time: '04:00', value: 47 },
      { time: '08:00', value: 46.2 },
      { time: '12:00', value: 45.8 },
      { time: '16:00', value: 45.5 },
      { time: '20:00', value: 45.8 },
    ],
  },
  {
    id: '6',
    name: 'CryptoBank Digital',
    logo: '🏦',
    category: 'Cryptocurrency',
    rating: 4.7,
    coinValue: 156.4,
    change24h: 12.3,
    marketCap: '$2.8B',
    description: 'Secure digital banking and cryptocurrency exchange',
    chartData: [
      { time: '00:00', value: 139 },
      { time: '04:00', value: 145 },
      { time: '08:00', value: 148 },
      { time: '12:00', value: 152 },
      { time: '16:00', value: 154 },
      { time: '20:00', value: 156.4 },
    ],
  },
];

const categories = ['All', 'Technology', 'Finance', 'Healthcare', 'Energy', 'Retail', 'Cryptocurrency'];

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filter companies
  const filteredCompanies = mockCompanies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || company.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (companyId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(companyId)) {
      newFavorites.delete(companyId);
    } else {
      newFavorites.add(companyId);
    }
    setFavorites(newFavorites);
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <Navigation />

      <main className="container mx-auto px-4 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Companies</h1>
          <p className="text-muted-foreground">
            Explore and invest in top-rated companies
          </p>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-12 w-full md:w-96"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    selectedCategory === category
                      ? 'btn-primary'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Companies Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredCompanies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCompany(company)}
                className="card p-6 cursor-pointer hover:shadow-lg transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-2xl">
                      {company.logo}
                    </div>
                    <div>
                      <h3 className="font-bold group-hover:text-primary transition-colors">
                        {company.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {company.category}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(company.id);
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        favorites.has(company.id)
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-semibold">{company.rating}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {company.marketCap}
                  </span>
                </div>

                {/* Coin Value */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold">
                      ${formatNumber(company.coinValue)}
                    </span>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        company.change24h >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {company.change24h >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {Math.abs(company.change24h)}%
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">24h change</p>
                </div>

                {/* Mini Chart */}
                <div className="h-16 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={company.chartData}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={company.change24h >= 0 ? '#10b981' : '#ef4444'}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* View Details Button */}
                <button className="mt-4 w-full py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  View Details
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* No Results */}
        {filteredCompanies.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No companies found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </motion.div>
        )}
      </main>

      {/* Coming Soon Modal */}
      <AnimatePresence>
        {selectedCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCompany(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-8 max-w-md w-full text-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedCompany(null)}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center text-4xl"
              >
                {selectedCompany.logo}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-2"
              >
                Coming Soon
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-2"
              >
                {selectedCompany.name}
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground mb-8"
              >
                Detailed company information and investment features will be available soon. Stay tuned!
              </motion.p>

              {/* Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={() => setSelectedCompany(null)}
                className="btn-primary w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Got it
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
