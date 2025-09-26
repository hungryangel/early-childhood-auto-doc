import { db } from '@/db';
import { classes } from '@/db/schema';

async function main() {
    const sampleClasses = [
        {
            age: '3-5세',
            className: '돌꽃반',
        }
    ];

    await db.insert(classes).values(sampleClasses);
    
    console.log('✅ Classes seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});