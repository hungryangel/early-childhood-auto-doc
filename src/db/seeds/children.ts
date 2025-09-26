import { db } from '@/db';
import { children } from '@/db/schema';

async function main() {
    const sampleChildren = [
        {
            name: '김민준',
            birthdate: new Date('2020-03-15').toISOString(),
            classId: 1,
        },
        {
            name: '이서연',
            birthdate: new Date('2019-11-22').toISOString(),
            classId: 1,
        },
        {
            name: '박지훈',
            birthdate: new Date('2021-07-08').toISOString(),
            classId: 1,
        }
    ];

    await db.insert(children).values(sampleChildren);
    
    console.log('✅ Children seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});