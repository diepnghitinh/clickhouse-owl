import { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Copy,
  Terminal,
  Search,
  Plus,
  Filter,
  Columns,
  MoreHorizontal,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Database,
  Check,
  Table as TableIcon,

  LayoutDashboard,
  Trash2
} from 'lucide-react';
import { executeQuery, listTables, listDatabases, type TableInfo, type QueryResponse, getToken, setToken } from './api/client';
import { ProtectedLayout } from './components/Layout';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { CreateDatabaseModal } from './components/CreateDatabaseModal';
import { CreateTableModal } from './components/CreateTableModal';
import { CreateRecordModal } from './components/CreateRecordModal';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { DropTableModal } from './components/DropTableModal';
import { Input } from './components/ui/Input';
import { cn } from './lib/utils';


export interface Activity {
  id: string;
  type: 'QUERY' | 'DDL' | 'ERROR';
  content: string;
  timestamp: Date;
  duration?: number;
  status: 'SUCCESS' | 'ERROR';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getToken());
  const [query, setQuery] = useState('SELECT 1 AS result');
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  const logActivity = (type: Activity['type'], content: string, status: Activity['status'], duration?: number) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date(),
      duration,
      status
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50
  };

  // Tab State
  const [activeTab, setActiveTab] = useState('dashboard');

  const [queryHistory, setQueryHistory] = useState<{ query: string; time: Date; duration: number }[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [showCreateRecordModal, setShowCreateRecordModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDatabases().then(() => fetchTables(selectedDatabase));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTables(selectedDatabase);
    }
  }, [selectedDatabase]);

  // Auto-select first table if none selected
  useEffect(() => {
    if (tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0].name);
    }
  }, [tables]);

  // Auto-query selected table
  useEffect(() => {
    if (selectedTable && activeTab === 'tables') {
      runQuery(`SELECT * FROM ${selectedTable} LIMIT 50`);
    }
  }, [selectedTable]);

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
  };

  const fetchDatabases = async () => {
    try {
      const dbs = await listDatabases();
      setDatabases(dbs);
      if (dbs.length > 0 && !dbs.includes(selectedDatabase)) {
        setSelectedDatabase(dbs[0]);
      }
    } catch (err) {
      console.error('Failed to fetch databases:', err);
    }
  };

  const fetchTables = async (db: string) => {
    try {
      const data = await listTables(db);
      setTables(data);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  };

  const runQuery = async (sql: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const startTime = performance.now();
    try {
      const data = await executeQuery(sql, selectedDatabase);
      const duration = performance.now() - startTime;
      setExecutionTime(duration);
      if (data.error) {
        setError(data.error);
        logActivity('ERROR', sql, 'ERROR', duration);
      } else {
        setResult(data);
        logActivity('QUERY', sql, 'SUCCESS', duration);
      }
    } catch (err: any) {
      setError(err.message);
      logActivity('ERROR', sql, 'ERROR', performance.now() - startTime);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    runQuery(query);
  };

  // Render Logic
  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <Dashboard
          databaseCount={databases.length}
          tableCount={tables.length}
          currentDatabase={selectedDatabase}
          activities={activities}
          onCreateDatabase={() => setShowCreateDbModal(true)}
          onCreateTable={() => setShowCreateTableModal(true)}
          onOpenSqlEditor={() => setActiveTab('query')}
        />
      );
    }

    if (activeTab === 'query') {
      return (
        <div className="flex flex-col h-full bg-background">
          <div className="border-b border-border p-2 bg-secondary/30 flex items-center justify-between">
            <span className="text-xs font-semibold px-2">SQL Editor</span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleRunQuery} loading={loading} icon={<Play className="w-3 h-3" />}>Run</Button>
            </div>
          </div>
          <div className="h-1/3 min-h-[200px] border-b border-border">
            <textarea
              ref={editorRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm"
              placeholder="SELECT * FROM ..."
            />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderResultTable()}
          </div>
        </div>
      );
    }

    // Default: Tables View (3-pane)
    return (
      <div className="flex h-full">
        {/* Secondary Sidebar: Table List */}
        <div className="w-[260px] border-r border-border flex flex-col bg-background">
          <div className="p-4 pb-2">
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === 'dashboard' ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-4">Tables</h2>

            {/* Database Selector with Dropdown */}
            <div className="relative mb-4 space-y-2">
              <div
                className="p-2 border border-border rounded-md flex items-center justify-between text-sm hover:bg-secondary/50 cursor-pointer"
                onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedDatabase}</span>
                </div>
                <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", isDbMenuOpen && "rotate-90")} />
              </div>

              {isDbMenuOpen && (
                <div className="absolute top-10 left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Switch Database</div>
                  {databases.map(db => (
                    <button
                      key={db}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary text-left transition-colors",
                        selectedDatabase === db && "bg-secondary font-medium"
                      )}
                      onClick={() => {
                        setSelectedDatabase(db);
                        setIsDbMenuOpen(false);
                      }}
                    >
                      <Database className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{db}</span>
                      {selectedDatabase === db && <Check className="w-3 h-3 ml-auto text-brand" />}
                    </button>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <button
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary text-left text-brand font-medium transition-colors"
                    onClick={() => {
                      setShowCreateDbModal(true);
                      setIsDbMenuOpen(false);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Database</span>
                  </button>
                </div>
              )}

              <div className="p-2 border border-border rounded-md flex items-center justify-between text-sm hover:bg-secondary/50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center font-bold text-xs text-muted-foreground">S</span>
                  <span>public</span>
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Search..."
                />
              </div>
              <button className="p-1.5 border border-border rounded-md hover:bg-secondary" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                className="p-1.5 border border-border rounded-md hover:bg-secondary"
                title="Create Table"
                onClick={() => setShowCreateTableModal(true)}
              >
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
            {tables.map(t => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${selectedTable === t.name
                  ? 'bg-secondary font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  } group`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="truncate flex-1 text-left">{t.name}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                    onClick={() => setTableToDelete(t.name)}
                    title="Drop Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))}
            {tables.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">No tables found</div>
            )}
          </div>
        </div>

        {/* Main Content: Data Grid */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Header Toolbar */}
          <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary cursor-pointer transition-colors">
                <div className="w-4 h-4 bg-secondary border border-border rounded flex items-center justify-center">
                  <Columns className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="w-px h-4 bg-border mx-1" />
              <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary cursor-pointer transition-colors">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{selectedDatabase}</span>
              </div>
              <span className="text-border">/</span>
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <TableIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{selectedTable || 'No table selected'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>Filters</Button>
              <Button variant="outline" size="sm" icon={<Columns className="w-3.5 h-3.5" />}>Columns</Button>
              <Button
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => selectedTable && setShowCreateRecordModal(true)}
                disabled={!selectedTable}
              >
                Add record
              </Button>
              <div className="w-px h-4 bg-border mx-2" />
              <div className="flex items-center text-xs text-muted-foreground gap-4">
                <span>{result?.rows.length || 0} rows</span>
                <span>{executionTime ? `${executionTime.toFixed(0)}ms` : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-secondary rounded"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-mono w-8 text-center">50</span>
                <button className="p-1 hover:bg-secondary rounded"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <button className="p-1.5 hover:bg-secondary rounded border border-border ml-2"><RefreshCw className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 hover:bg-secondary rounded border border-border"><MoreHorizontal className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-hidden relative">
            {renderResultTable()}
          </div>
        </div>
      </div>
    );
  };

  const renderResultTable = () => {
    if (error) return (
      <div className="p-8 flex items-center justify-center text-red-500 gap-2">
        <Terminal className="w-4 h-4" />
        <span className="text-sm font-mono">{error}</span>
      </div>
    );
    if (!result) return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Database className="w-12 h-12 mb-4 opacity-10" />
        <p className="text-sm">Select a table to view data</p>
      </div>
    );

    return (
      <div className="w-full h-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-background z-10 box-decoration-clone">
            <tr>
              <th className="w-10 border-b border-r border-border bg-secondary/30 p-0 sticky left-0 z-20">
                <input type="checkbox" className="m-3 rounded border-gray-300" />
              </th>
              {result.columns.map(col => (
                <th key={col} className="border-b border-r border-border bg-background px-3 py-2 text-left font-medium text-xs text-muted-foreground whitespace-nowrap min-w-[150px] group">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs opacity-50">#</span>
                    <span className="text-foreground">{col}</span>
                    <span className="ml-auto text-[10px] opacity-0 group-hover:opacity-50">text</span>
                  </div>
                </th>
              ))}
              <th className="border-b border-border bg-background w-full"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.rows.map((row, i) => (
              <tr key={i} className="hover:bg-secondary/20">
                <td className="border-r border-border px-3 py-1.5 text-center text-muted-foreground font-mono text-xs sticky left-0 bg-background hover:bg-secondary/20">
                  {i + 1}
                </td>
                {row.map((cell, j) => (
                  <td key={j} className="border-r border-border px-3 py-1.5 whitespace-nowrap font-mono text-xs text-foreground truncate max-w-[300px]">
                    {cell === null ? <span className="text-muted-foreground italic">NULL</span> : String(cell)}
                  </td>
                ))}
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;

  return (
    <>
      <ProtectedLayout
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        currentTab={activeTab}
        onTabChange={setActiveTab}
      >
        {renderContent()}
      </ProtectedLayout>

      {showCreateTableModal && (
        <CreateTableModal
          onClose={() => setShowCreateTableModal(false)}
          onSuccess={() => {
            fetchTables(selectedDatabase);
            logActivity('DDL', `Created table in ${selectedDatabase}`, 'SUCCESS');
          }}
          database={selectedDatabase}
        />
      )}

      {showCreateDbModal && (
        <CreateDatabaseModal
          onClose={() => setShowCreateDbModal(false)}
          onSuccess={() => {
            fetchDatabases();
            logActivity('DDL', 'Created new database', 'SUCCESS');
          }}
        />
      )}

      {showCreateRecordModal && selectedTable && (
        <CreateRecordModal
          onClose={() => setShowCreateRecordModal(false)}
          onSuccess={() => {
            runQuery(`SELECT * FROM ${selectedTable} LIMIT 50`);
            logActivity('QUERY', `Inserted record into ${selectedTable}`, 'SUCCESS');
          }}
          database={selectedDatabase}
          tableName={selectedTable}
          columns={tables.find(t => t.name === selectedTable)?.columns || []}
        />
      )}

      {tableToDelete && (
        <DropTableModal
          onClose={() => setTableToDelete(null)}
          onSuccess={() => {
            fetchTables(selectedDatabase);
            logActivity('DDL', `Dropped table ${tableToDelete}`, 'SUCCESS');
            if (selectedTable === tableToDelete) {
              setSelectedTable(null);
              setResult(null);
            }
          }}
          database={selectedDatabase}
          tableName={tableToDelete}
        />
      )}
    </>
  );
}

export default App;
