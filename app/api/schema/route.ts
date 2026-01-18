import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DataSourceFactory } from '@/lib/datasources/DataSourceFactory';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const database = searchParams.get('db');
    const table = searchParams.get('table');

    if (!database || !table) {
        return NextResponse.json({ error: 'Database and Table parameters are required' }, { status: 400 });
    }

    try {
        const dataSource = await DataSourceFactory.createDataSource(database, session.connection);
        const schema = await dataSource.getTableSchema(table);
        return NextResponse.json(schema);
    } catch (error: any) {
        console.error("Failed to fetch schema:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
