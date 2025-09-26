import { db } from '@/db';
import { developmentEvaluations } from '@/db/schema';

async function main() {
    const sampleEvaluations = [
        {
            childId: 1,
            period: '상반기',
            overallCharacteristics: '활발하고 호기심이 많은 아이입니다. 새로운 활동에 적극적으로 참여하며, 친구들과의 상호작용을 즐깁니다.',
            parentMessage: '가정에서도 많은 성장을 보이고 있으며, 부모님과의 소통이 원활합니다. 앞으로도 지속적인 관심과 격려 부탁드립니다.',
            observations: '사회성 발달: 샘플 내용',
            ageAtEvaluation: '42개월',
            createdAt: new Date().toISOString(),
        }
    ];

    await db.insert(developmentEvaluations).values(sampleEvaluations);
    
    console.log('✅ Development evaluations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});