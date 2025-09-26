import { db } from '@/db';
import { dailyChildObservations, children } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
    const targetObservations = [
        { childId: 4, date: '2024-09-20', observation: "아이가 블록 쌓기 활동에서 높은 집중력을 보였습니다. 15분 동안 끊임없이 탑을 쌓아 올렸고, 무너질 때마다 다시 시작했습니다. 집중력과 창의성, 인내심이 돋보였습니다." },
        { childId: 8, date: '2024-09-19', observation: "친구들과 역할놀이 시간에 의사 역할을 맡아 적극적으로 참여했습니다. 다른 아이들을 돌보는 모습이 인상적이었습니다. 사회성과 협동심, 배려심을 보였습니다." },
        { childId: 12, date: '2024-09-18', observation: "미술활동에서 색감을 잘 활용하여 독창적인 그림을 그렸습니다. 본인만의 스타일이 뚜렷하게 나타났습니다. 창의성과 예술성, 표현력이 우수합니다." },
        { childId: 14, date: '2024-09-17', observation: "점심시간에 스스로 정리정돈을 하고 다른 친구들도 도왔습니다. 리더십과 책임감이 돋보였습니다. 자립성과 협동심이 좋습니다." },
        { childId: 4, date: '2024-09-16', observation: "새로운 교구에 대한 호기심이 많고 질문을 적극적으로 했습니다. 탐구하는 자세가 훌륭했습니다. 탐구심과 호기심, 학습능력이 뛰어납니다." }
    ];

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const targetObservation of targetObservations) {
        try {
            // 1. Get child's classId
            const child = await db.select({ classId: children.classId })
                .from(children)
                .where(eq(children.id, targetObservation.childId))
                .limit(1);

            if (child.length === 0) {
                console.log(`⚠️ Child with ID ${targetObservation.childId} not found, skipping observation for ${targetObservation.date}`);
                skippedCount++;
                continue;
            }

            const classId = child[0].classId;

            // 2. Check if record already exists
            const existingObservation = await db.select({ id: dailyChildObservations.id })
                .from(dailyChildObservations)
                .where(
                    and(
                        eq(dailyChildObservations.childId, targetObservation.childId),
                        eq(dailyChildObservations.date, targetObservation.date)
                    )
                )
                .limit(1);

            if (existingObservation.length > 0) {
                console.log(`⏭️ Observation already exists for childId ${targetObservation.childId} on ${targetObservation.date}, skipping`);
                skippedCount++;
                continue;
            }

            // 3. Insert new observation
            await db.insert(dailyChildObservations).values({
                classId: classId,
                date: targetObservation.date,
                childId: targetObservation.childId,
                observation: targetObservation.observation,
                createdAt: new Date().toISOString()
            });

            console.log(`✅ Inserted observation for childId ${targetObservation.childId} on ${targetObservation.date}`);
            insertedCount++;

        } catch (error) {
            console.error(`❌ Error processing observation for childId ${targetObservation.childId} on ${targetObservation.date}:`, error);
            errorCount++;
        }
    }

    console.log(`\n📊 Seeder Summary:`);
    console.log(`✅ Inserted: ${insertedCount} records`);
    console.log(`⏭️ Skipped: ${skippedCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log('✅ Daily child observations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});