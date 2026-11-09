import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  GraduationCap,
  Building2,
  CheckCircle2,
  X,
  LayoutGrid,
  ListFilter,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../api';
import { ICourse } from '../../types';
import { useApp } from '../../context/AppContext';
import { CourseCardSkeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

export interface CourseCatalogProps {
  initialCategory?: string;
  onSelectCourse?: (courseId: string) => void;
  className?: string;
  title?: string;
  subtitle?: string;
}

type SortOption = 'POPULAR' | 'RATING' | 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST';

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  initialCategory = 'All',
  onSelectCourse,
  className,
  title = 'World-Class Curricula & Accredited Programs',
  subtitle = 'Explore university-standard courses, vocational certifications, and interactive masterclasses verified by leading academic faculties.',
}) => {
  const { openCourse } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('POPULAR');
  const [isDenseGrid, setIsDenseGrid] = useState(false);

  // TanStack Query for high-performance cached data fetching
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['courses-catalog', { category: selectedCategory }],
    queryFn: async () => {
      const response = await api.getCourses({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      });
      return response.courses || [];
    },
    staleTime: 60_000,
  });

  const allCourses: ICourse[] = data || [];

  // Dynamic Categories derived from dataset + defaults
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const c of allCourses) {
      if (c.category) set.add(c.category);
    }
    return Array.from(set);
  }, [allCourses]);

  // Client-side filtering & sorting
  const filteredCourses = useMemo(() => {
    let result = [...allCourses];

    // Search query matching title, instructor, tags
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(query) ||
          c.tagline.toLowerCase().includes(query) ||
          c.instructorName.toLowerCase().includes(query) ||
          (c.institutionName && c.institutionName.toLowerCase().includes(query)) ||
          c.category.toLowerCase().includes(query)
      );
    }

    // Level Filter
    if (selectedLevel !== 'All') {
      result = result.filter(c => c.level === selectedLevel);
    }

    // Education / Audience Tier Filter
    if (selectedTier !== 'All') {
      result = result.filter(c => {
        if (selectedTier === 'FREE') return c.price === 0;
        if (selectedTier === 'PAID') return c.price > 0;
        if (selectedTier === 'ACCREDITED') return Boolean(c.tenantId || c.institutionName);
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'RATING':
          return (b.rating || 0) - (a.rating || 0);
        case 'PRICE_ASC':
          return (a.price || 0) - (b.price || 0);
        case 'PRICE_DESC':
          return (b.price || 0) - (a.price || 0);
        case 'NEWEST':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        case 'POPULAR':
        default:
          return (b.enrolledCount || 0) - (a.enrolledCount || 0);
      }
    });

    return result;
  }, [allCourses, searchTerm, selectedLevel, selectedTier, sortBy]);

  const handleCardClick = (courseId: string) => {
    if (onSelectCourse) {
      onSelectCourse(courseId);
    } else {
      openCourse(courseId);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedLevel('All');
    setSelectedTier('All');
    setSortBy('POPULAR');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategory !== 'All' ||
    selectedLevel !== 'All' ||
    selectedTier !== 'All';

  return (
    <section className={cn('w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10', className)}>
      {/* Header with Luxury Brand Accent */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Verified Academic Directory
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Dense / Relaxed View Toggle */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setIsDenseGrid(false)}
              className={cn(
                'p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                !isDenseGrid
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-soft'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
              title="Standard Grid"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Featured</span>
            </button>
            <button
              onClick={() => setIsDenseGrid(true)}
              className={cn(
                'p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                isDenseGrid
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-soft'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
              title="Dense Grid"
            >
              <ListFilter className="w-4 h-4" />
              <span className="hidden sm:inline">Compact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search Input + Sorting + Filter Tray */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-8 shadow-soft">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by topic, instructor, keywords, or university..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filters Group */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Level Selector */}
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="All">All Skill Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="All Levels">All Levels</option>
            </select>

            {/* Pricing / Tier Filter */}
            <select
              value={selectedTier}
              onChange={e => setSelectedTier(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="All">All Pricing Tiers</option>
              <option value="FREE">Free & Open Syllabi</option>
              <option value="PAID">Certified / Premium</option>
              <option value="ACCREDITED">Institutional Partner</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="POPULAR">Most Popular</option>
              <option value="RATING">Highest Rated</option>
              <option value="NEWEST">Newly Added</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills with Fluid Active Indicator */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Category:
          </span>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200',
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-soft scale-100 ring-2 ring-indigo-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header Counter & Reset Shortcut */}
      <div className="flex items-center justify-between mb-6 text-sm text-slate-500">
        <div>
          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredCourses.length}</span>{' '}
          {filteredCourses.length === 1 ? 'curriculum' : 'curricula'}
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-4"
          >
            <X className="w-3.5 h-3.5" />
            Clear all filters
          </button>
        )}
      </div>

      {/* Grid: Loading Skeletons vs Data vs Empty State */}
      {isLoading ? (
        <div
          className={cn(
            'grid gap-6',
            isDenseGrid
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-panel rounded-3xl p-10 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Failed to Load Catalog
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {(error as any)?.message || 'An error occurred while connecting to the course catalog.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-soft hover:bg-indigo-700 transition-all"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-xl mx-auto border-dashed border-2 border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No matching courses found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            We couldn't find any courses matching your specific search and filter criteria. Try adjusting your query or resetting your active filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-soft hover:bg-indigo-700 transition-all"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
          className={cn(
            'grid gap-6',
            isDenseGrid
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          <AnimatePresence>
            {filteredCourses.map(course => (
              <motion.article
                key={course.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                onClick={() => handleCardClick(course.id)}
                className="group cursor-pointer glass-card rounded-2xl overflow-hidden flex flex-col justify-between h-full hover:shadow-elevated"
              >
                <div>
                  {/* Thumbnail Stage with Badges */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-900/85 backdrop-blur-md text-white border border-white/10">
                        {course.level}
                      </span>
                      {course.price === 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-sm">
                          Free Syllabus
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white backdrop-blur-md shadow-sm">
                          ${course.price}
                        </span>
                      )}
                    </div>

                    {/* Bottom Metadata inside thumbnail */}
                    {course.institutionName && (
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5 text-white/90 text-xs font-semibold truncate">
                        <Building2 className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                        <span className="truncate">{course.institutionName}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    {/* Category & Rating Bar */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                        {course.category}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{(course.rating || 5.0).toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">
                          ({course.ratingCount || 1})
                        </span>
                      </div>
                    </div>

                    {/* Course Title */}
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                      {course.title}
                    </h3>

                    {/* Tagline / Abstract */}
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {course.tagline}
                    </p>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {course.durationHours || 12}h
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      {course.enrolledCount || 0} enrolled
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold group-hover:translate-x-1 transition-transform">
                    Explore
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
};
