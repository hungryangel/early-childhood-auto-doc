import { db } from '@/db';
import { observationLogs } from '@/db/schema';

async function main() {
    const sampleObservationLogs = [
        {
            childId: 1,
            month: '2024-09-01',
            keywords: '사회성 발달',
            content: '샘플 내용',
            createdAt: new Date().toISOString(),
        }
    ];

    await db.insert(observationLogs).values(sampleObservationLogs);
    
    console.log('✅ Observation logs seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});