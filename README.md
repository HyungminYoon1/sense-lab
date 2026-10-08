# SENSE LAB

색·소리·움직임을 직접 조작하는 브라우저 감각 실험실입니다. 개인 이력 대신 방문자가 바로 체험할 수 있는 인터랙션을 중심으로 만든 GitHub Pages 학습 프로젝트입니다.

- 사이트: [SENSE LAB](https://hyungminyoon1.github.io/sense-lab/)
- 저장소: [HyungminYoon1/sense-lab](https://github.com/HyungminYoon1/sense-lab)

## 세 가지 실험

1. **색의 상대성**: 같은 중앙색을 서로 다른 밝기의 배경에서 비교합니다. 배경 밝기 차이와 중앙색을 바꾸고, 배경을 지워 색이 같은지 확인합니다.
2. **눈으로 듣는 소리**: Web Audio API로 사인파·삼각파·사각파를 합성합니다. 주파수(80–880 Hz)와 제한된 앱 음량을 조절하며 파형 모델을 확인합니다.
3. **움직임의 흔적**: 포인터·터치·방향키로 입자 패턴의 중심을 바꾸고, 끌어당김/밀어냄·개수·잔상을 조절합니다. 일시정지, 초기화, 현재 캔버스 PNG 다운로드를 지원합니다.

소리는 사용자가 버튼을 눌러야 시작하며, 다른 실험으로 이동하거나 탭이 숨겨지면 꺼집니다. **앱 음량 제한이 실제 기기의 청취 음량을 보장하지는 않습니다.** 기기 음량부터 낮춰주세요. 파형은 합성 신호의 설명용 시각화이지 마이크 녹음이나 실시간 음향 분석이 아닙니다. 입자 실험 역시 정밀 물리 시뮬레이션이 아닙니다.

## 실행과 검증

Node.js 22 이상에서 별도의 패키지 설치 없이 실행할 수 있습니다.

```sh
git clone https://github.com/HyungminYoon1/sense-lab.git
cd sense-lab
npm run dev -- 0
```

출력된 Local 주소를 브라우저에서 엽니다. 0은 사용 가능한 임시 포트를 자동으로 선택합니다. 파일 변경 후 새로고침하세요.

```sh
npm test
npm run check
```

6개의 순수 모델 테스트와 정적 자산 경로·JavaScript 문법 검사를 제공합니다. 자동 테스트는 실제 스피커 출력이나 모든 기기의 동작을 보증하지 않습니다. 실제 검증 범위는 [검증 기록](docs/verification.md)을 참조하세요.

## GitHub Pages 배포

Settings → Pages → Source가 **GitHub Actions**인 저장소입니다. main에 푸시하면 테스트와 자산 검사를 통과한 뒤 dist만 배포합니다. workflow_dispatch로 수동 배포할 수도 있습니다. 모든 자산 경로는 상대 경로로 작성했습니다.

## 개인정보와 제작 방식

로그인·외부 API·분석 도구·영구 저장 기능이 없습니다. 실험 설정은 페이지 메모리에만 남고, PNG는 사용자의 기기로 내려받습니다. GitHub 호스팅 자체의 방문 로그는 별개입니다. 외부 글꼴·이미지·추적 스크립트를 불러오지 않습니다.

AI 에이전트의 도움으로 구현·문서 작성·검증·배포한 실험적 첫 버전입니다. 개인의 직접 작성 경험이나 전문적인 과학 검증을 주장하지 않습니다.

- [구조](architecture.md)
- [결정 기록](docs/decisions.md)
- [MDN Web Audio API](https://developer.mozilla.org/ko/docs/Web/API/Web_Audio_API)
- [MDN Canvas API](https://developer.mozilla.org/ko/docs/Web/API/Canvas_API)

텍스트는 UTF-8 without BOM / CRLF를 사용합니다. 라이선스는 아직 별도로 부여하지 않았습니다.
