# 계정 및 배포 대상

- 제출용 GitHub 저장소: `sjuri20/packtrail` (공개), 계정 `sjuri20`, 기본 브랜치 `main`.
- 기존 `sjuri20/recyspec-ai`는 별도의 기존 프로젝트이며 제출 대상이 아니다.
- Vercel 계정 연결: 주리, 팀 `Onlab Partners` (`onlabpartners`, `team_BdJdgzOuiGqnsO5YaWOcLkzZ`). 프로젝트 `packtrail`, ID `prj_YqdwNK4nVoEfWKaHmjRlQ3ITaOyl`.
- 요청된 운영 주소 `packtrail.vercel.app`은 이미 다른 웹사이트가 응답하므로 연결하지 않았다. 사용자가 선택한 대체 운영 주소 `packtrail-ai.vercel.app`에 시연 버전이 배포되었다.
- 영구 검색 자료: Supabase `OnLab Partners`, 별도 프로젝트 `PackTrail`, ID `jphqqwufxadonnbawiiw`. 서버 환경변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 필요하다. 비밀 키는 저장소에 기록하지 않는다.
- Vercel 서버리스 환경에서 지속 저장소 및 스케줄러를 별도 구성해야 한다. 현재 로컬 SQLite 구현은 Vercel에 그대로 배포할 수 없다.
- 기존 Sites 시연은 별도 소스와 저장소를 사용하는 소유자 전용 사이트다.
