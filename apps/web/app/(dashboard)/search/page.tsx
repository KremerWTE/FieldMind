'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [buildings, setBuildings] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    buildingId: '',
    minSeverity: '',
    aiStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const token = () => localStorage.getItem('accessToken');
  const h = (json = false) => ({
    Authorization: `Bearer ${token()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    Promise.all([
      fetch(`${base}/buildings?limit=100`, { headers: h() }).then((r) => r.json()),
      fetch(`${base}/search/categories`, { headers: h() }).then((r) => r.json()),
      fetch(`${base}/search/tags?limit=30`, { headers: h() }).then((r) => r.json()),
    ]).then(([b, cat, t]) => {
      setBuildings(Array.isArray(b) ? b : b.buildings ?? []);
      setCategories(cat.categories ?? []);
      setTags(t.tags ?? []);
    }).catch(() => {});
  }, []);

  const search = async (p = 1) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${base}/search`, {
        method: 'POST',
        headers: h(true),
        body: JSON.stringify({
          query: query || undefined,
          buildingId: filters.buildingId || undefined,
          minSeverity: filters.minSeverity || undefined,
          aiStatus: filters.aiStatus || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          page: p,
          pageSize: PAGE_SIZE,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setTotalCount(data.totalCount ?? 0);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const severityColor = (score?: number) => {
    if (score == null) return 'text-gray-400';
    if (score >= 8) return 'text-red-600';
    if (score >= 5) return 'text-orange-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search Photos</h1>
        <p className="text-sm text-gray-500 mt-1">Full-text search across AI annotations, buildings, and projects</p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); search(1); }}
        className="flex gap-3 mb-6"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search annotations, tags, descriptions…"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        <div className="w-56 flex-shrink-0 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Building</label>
            <select
              value={filters.buildingId}
              onChange={(e) => setFilters({ ...filters, buildingId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All buildings</option>
              {buildings.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Min Severity</label>
            <select
              value={filters.minSeverity}
              onChange={(e) => setFilters({ ...filters, minSeverity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Any severity</option>
              <option value="low">Low+</option>
              <option value="medium">Medium+</option>
              <option value="high">High+</option>
              <option value="critical">Critical only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">AI Status</label>
            <select
              value={filters.aiStatus}
              onChange={(e) => setFilters({ ...filters, aiStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Any</option>
              <option value="Completed">Analyzed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Date Range</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm mb-1"
              placeholder="From"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              placeholder="To"
            />
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Categories</label>
              <div className="space-y-1">
                {categories.slice(0, 10).map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="rounded"
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Popular Tags</label>
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 15).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-full text-gray-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : !searched ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-16 text-center">
              <p className="text-gray-400 text-sm">Enter a search query or apply filters, then click Search.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 text-sm">No results found.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">{totalCount} result{totalCount !== 1 ? 's' : ''}</p>
              <div className="space-y-3">
                {results.map((r: any, i: number) => (
                  <Link
                    key={r.photo?.id ?? i}
                    href={`/photos/${r.photo?.id}`}
                    className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        {r.viewUrl ? (
                          <img src={r.viewUrl} alt="photo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📷</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {r.building?.name ?? '—'} · {r.project?.name ?? '—'}
                            </p>
                            {r.folder && (
                              <p className="text-xs text-gray-500">📁 {r.folder.name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {r.aiAnnotation?.severityScore != null && (
                              <span className={`text-xs font-semibold ${severityColor(r.aiAnnotation.severityScore)}`}>
                                {r.aiAnnotation.severityScore}/10
                              </span>
                            )}
                            {r.relevanceScore != null && (
                              <span className="text-xs text-gray-400">{Math.round(r.relevanceScore * 100)}% match</span>
                            )}
                          </div>
                        </div>

                        {r.aiAnnotation?.shortDescription && (
                          <p className="text-sm text-gray-700 mt-1 truncate">{r.aiAnnotation.shortDescription}</p>
                        )}

                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.matchedFields?.map((f: string) => (
                            <span key={f} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              {f}
                            </span>
                          ))}
                          {r.aiAnnotation?.categories?.slice(0, 3).map((c: string) => (
                            <span key={c} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {c}
                            </span>
                          ))}
                        </div>

                        <p className="text-xs text-gray-400 mt-1.5">
                          {r.photo?.capturedAt
                            ? format(new Date(r.photo.capturedAt), 'MMM d, yyyy')
                            : r.photo?.uploadedAt
                            ? format(new Date(r.photo.uploadedAt), 'MMM d, yyyy')
                            : ''}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex gap-2 justify-end">
                  <button
                    onClick={() => search(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => search(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
