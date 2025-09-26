import { db } from '@/db';
import { dailyChildObservations } from '@/db/schema';

async function main() {
    const sampleObservations = [
        {
            classId: 1,
            date: '2024-12-10',
            childId: 1,
            observation: '블록놀이 시간에 친구들과 함께 큰 성을 만들며 "이렇게 하면 더 높아져요"라고 의견을 제시하고 협력하는 모습을 보였습니다.',
            createdAt: new Date('2024-12-10T10:30:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-10',
            childId: 2,
            observation: '미술활동 중 색연필로 세밀하게 그림을 그리며 "엄마 얼굴이에요"라고 설명하고, 다양한 색깔을 사용하여 창의적으로 표현했습니다.',
            createdAt: new Date('2024-12-10T14:20:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-11',
            childId: 3,
            observation: '점심시간에 혼자 앉아 있는 친구를 발견하고 "같이 먹을래?"라고 말하며 배려하는 마음을 보여주었습니다.',
            createdAt: new Date('2024-12-11T12:15:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-12',
            childId: 1,
            observation: '신체활동 시간에 한 발로 서기를 10초 이상 유지하며 균형감각이 향상되었고, 다른 친구들을 응원하는 모습도 보였습니다.',
            createdAt: new Date('2024-12-12T15:45:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-13',
            childId: 2,
            observation: '동화책 읽기 시간에 집중하여 듣고 "공주가 왜 울었을까요?"라고 질문하며 적극적으로 참여했습니다.',
            createdAt: new Date('2024-12-13T11:00:00').toISOString(),
        },
        {
            classId:1,
            date: '2024-12-13',
            childId: 3,
            observation: '정리정돈 시간에 장난감을 제자리에 놓지 않고 다른 활동을 하려고 해서 규칙의 중요성에 대해 이야기했습니다.',
            createdAt: new Date('2024-12-13T16:30:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-16',
            childId: 1,
            observation: '음악시간에 리듬악기를 연주하며 박자를 정확히 맞추고, 친구들과 함께 노래를 부르며 즐거워했습니다.',
            createdAt: new Date('2024-12-16T10:15:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-16',
            childId: 2,
            observation: '친구와 다툼이 있을 때 화를 내며 울음을 터뜨렸지만, 교사의 도움으로 감정을 조절하고 사과할 수 있었습니다.',
            createdAt: new Date('2024-12-16T13:20:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-17',
            childId: 3,
            observation: '과학실험 활동에서 물과 기름이 섞이지 않는 것을 관찰하고 "왜 그럴까요?"라며 호기심을 보였습니다.',
            createdAt: new Date('2024-12-17T14:45:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-18',
            childId: 1,
            observation: '역할놀이에서 의사 역할을 맡아 "아픈 곳이 어디예요?"라고 묻고 친구를 돌보는 모습을 보였습니다.',
            createdAt: new Date('2024-12-18T09:30:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-19',
            childId: 2,
            observation: '퍼즐 맞추기 활동에서 20분 동안 집중하여 완성했고, "선생님 다 했어요!"라며 성취감을 표현했습니다.',
            createdAt: new Date('2024-12-19T15:10:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-19',
            childId: 3,
            observation: '실외놀이 시간에 미끄럼틀에서 내려오기를 무서워했지만, 친구들의 격려로 용기를 내어 성공했습니다.',
            createdAt: new Date('2024-12-19T11:40:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-20',
            childId: 1,
            observation: '언어활동에서 "ㄱ"으로 시작하는 단어를 5개 이상 말하며 어휘력 향상을 보였고, 발음도 정확했습니다.',
            createdAt: new Date('2024-12-20T10:50:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-23',
            childId: 2,
            observation: '요리활동에서 샌드위치 만들기를 할 때 순서를 기억하여 스스로 완성하고 "맛있게 드세요"라고 말했습니다.',
            createdAt: new Date('2024-12-23T13:30:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-23',
            childId: 3,
            observation: '크리스마스 카드 만들기에서 가위질이 서툴러 도움을 요청했지만, 끝까지 포기하지 않고 완성했습니다.',
            createdAt: new Date('2024-12-23T14:15:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-24',
            childId: 1,
            observation: '자유놀이 시간에 새로운 친구에게 먼저 다가가 "같이 놀자"라고 말하며 사회성 발달을 보였습니다.',
            createdAt: new Date('2024-12-24T16:00:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-24',
            childId: 2,
            observation: '동요 부르기 시간에 큰 소리로 자신감 있게 노래하며, 손동작도 함께 표현하여 적극적으로 참여했습니다.',
            createdAt: new Date('2024-12-24T11:20:00').toISOString(),
        },
        {
            classId: 1,
            date: '2024-12-25',
            childId: 3,
            observation: '크리스마스 파티에서 친구들과 함께 춤을 추며 즐거워했고, "메리 크리스마스"라고 인사하는 모습을 보였습니다.',
            createdAt: new Date('2024-12-25T15:30:00').toISOString(),
        },
    ];

    await db.insert(dailyChildObservations).values(sampleObservations);
    
    console.log('✅ Daily child observations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});