export interface CourseSearchDocument {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: string;
  instructorName: string;
  institutionName: string;
  price: number;
  rating: number;
  ratingCount: number;
  durationHours: number;
  tags: string[];
  isPublished: boolean;
  tenantId: string | null;
}

export interface SearchQueryOptions {
  query?: string;
  category?: string;
  level?: string;
  tenantId?: string | null;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  hits: T[];
  totalHits: number;
  page: number;
  totalPages: number;
  facets: {
    categories: Record<string, number>;
    levels: Record<string, number>;
    priceRanges: Record<string, number>;
  };
}

export interface ISearchProvider {
  indexCourse(course: CourseSearchDocument): Promise<void>;
  updateCourse(courseId: string, updates: Partial<CourseSearchDocument>): Promise<void>;
  deleteCourse(courseId: string): Promise<void>;
  searchCourses(options: SearchQueryOptions): Promise<SearchResult<CourseSearchDocument>>;
}
