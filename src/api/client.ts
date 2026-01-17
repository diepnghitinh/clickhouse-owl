import axios from 'axios';

const API_BASE = '/api';

export interface QueryResponse {
    columns: string[];
    rows: any[][];
    error?: string;
}

export interface TableInfo {
    name: string;
    schema: string;
    columns: ColumnDef[];
}

export interface ColumnDef {
    id: number;
    name: string;
    type: DataType;
    nullable: boolean;
    primary_key: boolean;
    default: string;
}

// ClickHouse data types
export const DataType = {
    TypeUnknown: 0,
    // Integer types
    TypeInt8: 1,
    TypeInt16: 2,
    TypeInt32: 3,
    TypeInt64: 4,
    TypeUInt8: 5,
    TypeUInt16: 6,
    TypeUInt32: 7,
    TypeUInt64: 8,
    // Float types
    TypeFloat32: 9,
    TypeFloat64: 10,
    // Decimal types
    TypeDecimal: 11,
    TypeDecimal32: 12,
    TypeDecimal64: 13,
    TypeDecimal128: 14,
    TypeDecimal256: 15,
    // String types
    TypeString: 16,
    TypeFixedString: 17,
    // Date/Time types
    TypeDate: 18,
    TypeDate32: 19,
    TypeDateTime: 20,
    TypeDateTime64: 21,
    // Special types
    TypeUUID: 22,
    TypeIPv4: 23,
    TypeIPv6: 24,
    TypeEnum8: 25,
    TypeEnum16: 26,
    TypeArray: 27,
    TypeTuple: 28,
    TypeNullable: 29,
    TypeLowCardinality: 30,
    TypeMap: 31,
    TypeJSON: 32,
} as const;

export type DataType = typeof DataType[keyof typeof DataType];

// Token management
let token: string | null = localStorage.getItem('clickhouse_owl_token');

export const setToken = (newToken: string | null) => {
    token = newToken;
    if (newToken) {
        localStorage.setItem('clickhouse_owl_token', newToken);
    } else {
        localStorage.removeItem('clickhouse_owl_token');
    }
};

export const getToken = () => token;

// Add auth header
axios.interceptors.request.use(config => {
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            setToken(null);
            // Trigger a reload or event to potential logout logic if needed
            // For now, App component will detect token absence on next render/action if we manage state there
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const login = async (user: string, password: string, url?: string, database?: string): Promise<{ token: string; error?: string }> => {
    try {
        const response = await axios.post<{ token: string; error?: string }>(`${API_BASE}/login`, { user, password, url, database });
        if (response.data.token) {
            setToken(response.data.token);
        }
        return response.data;
    } catch (err: any) {
        return { token: '', error: err.response?.data?.error || err.message };
    }
};

export const executeQuery = async (query: string, database?: string): Promise<QueryResponse> => {
    const response = await axios.post<QueryResponse>(`${API_BASE}/query`, { query, database });
    return response.data;
};

export const listTables = async (database?: string): Promise<TableInfo[]> => {
    const params = database ? { db: database } : {};
    const response = await axios.get<TableInfo[]>(`${API_BASE}/tables`, { params });
    return response.data;
};

export const listDatabases = async (): Promise<string[]> => {
    const response = await axios.get<string[]>(`${API_BASE}/databases`);
    return response.data;
};
