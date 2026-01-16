import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { executeQuery, type ColumnDef, DataType } from '../api/client';

interface CreateRecordModalProps {
    onClose: () => void;
    onSuccess: () => void;
    database: string;
    tableName: string;
    columns: ColumnDef[];
}

export function CreateRecordModal({ onClose, onSuccess, database, tableName, columns }: CreateRecordModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [values, setValues] = useState<Record<string, any>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Filter out empty values for non-string types to allow NULL (logic can be improved)
            // For now, send all keys present in 'values' state.

            const cols = Object.keys(values);
            if (cols.length === 0) {
                throw new Error("No data to insert");
            }

            const valList = cols.map(col => {
                const val = values[col];
                const colDef = columns.find(c => c.name === col);

                if (colDef?.type === DataType.TypeString || colDef?.type === DataType.TypeTimestamp || colDef?.type === DataType.TypeDate || colDef?.type === DataType.TypeUUID) {
                    return `'${val.replace(/'/g, "''")}'`;
                }
                return val;
            });

            const query = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${valList.join(', ')})`;

            const res = await executeQuery(query, database);
            if (res.error) {
                throw new Error(res.error);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (colName: string, value: any) => {
        setValues(prev => ({
            ...prev,
            [colName]: value
        }));
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-popover border border-border rounded-lg shadow-lg w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Add Record to {tableName}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <form id="create-record-form" onSubmit={handleSubmit} className="space-y-4">
                        {columns.map(col => (
                            <div key={col.id} className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    {col.name}
                                    <span className="text-xs text-muted-foreground font-normal ml-auto">
                                        {getTypeName(col.type)}
                                        {col.primary_key && " (PK)"}
                                        {!col.nullable && <span className="text-destructive">*</span>}
                                    </span>
                                </label>
                                {renderInput(col, values[col.name] || '', (val) => handleInputChange(col.name, val))}
                            </div>
                        ))}
                    </form>
                </div>

                <div className="p-4 border-t border-border flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                    <Button type="submit" form="create-record-form" loading={loading} icon={<Save className="w-4 h-4" />}>
                        Save Record
                    </Button>
                </div>
            </div>
        </div>
    );
}

function renderInput(col: ColumnDef, value: any, onChange: (val: any) => void) {
    if (col.type === DataType.TypeBoolean) {
        return (
            <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={value === '' ? '' : (value ? 'true' : 'false')}
                onChange={e => {
                    const val = e.target.value;
                    if (val === '') onChange('');
                    else onChange(val === 'true');
                }}
            >
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        );
    }

    // Default text input for most types
    // Using string input for numbers for simplicity in this MVP, 
    // but type="number" could be used for numeric types.
    const isNumeric = col.type >= DataType.TypeInt8 && col.type <= DataType.TypeFloat64;

    return (
        <Input
            type={isNumeric ? "number" : "text"}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={col.default ? `Default: ${col.default}` : ''}
            required={!col.nullable && !col.default && !col.primary_key /* DB might gen PK */}
        // Note: PK usually auto-generated if SERIAL, but here we don't know if it is SERIAL.
        // Assuming simplified user entry for now.
        />
    );
}

function getTypeName(t: DataType): string {
    // Basic mapping for display
    const map: Record<number, string> = {
        [DataType.TypeBoolean]: "BOOL",
        [DataType.TypeInt32]: "INT4",
        [DataType.TypeInt64]: "INT8",
        [DataType.TypeString]: "TEXT",
        [DataType.TypeTimestamp]: "TS",
        // Add others as needed
    };
    return map[t] || "UNK";
}
