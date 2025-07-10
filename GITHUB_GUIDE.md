# 🚀 GitHub 업로드 및 배포 가이드

## 📁 생성된 파일 구조

```
csv-analyzer/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   ├── index.css
│   └── UniversalCSVAnalyzer.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── README.md
└── GITHUB_GUIDE.md (이 파일)
```

## 🛠️ 로컬에서 실행하기

1. **Node.js 설치** (아직 안 했다면)
   - https://nodejs.org 에서 LTS 버전 다운로드

2. **터미널에서 프로젝트 폴더로 이동**
   ```bash
   cd "C:\Users\KPC_User\Documents\obsidian\mcp\csv-analyzer"
   ```

3. **의존성 설치**
   ```bash
   npm install
   ```

4. **개발 서버 실행**
   ```bash
   npm start
   ```
   - 브라우저에서 http://localhost:3000 자동 실행

## 📤 GitHub에 업로드하기

### 1단계: Git 초기화
```bash
cd "C:\Users\KPC_User\Documents\obsidian\mcp\csv-analyzer"
git init
git add .
git commit -m "Initial commit: CSV Analyzer App"
```

### 2단계: GitHub Repository 생성
1. https://github.com 로그인
2. "New repository" 클릭
3. Repository name: `csv-analyzer`
4. Public 선택
5. "Create repository" 클릭

### 3단계: 원격 저장소 연결 및 푸시
```bash
git remote add origin https://github.com/YOUR_USERNAME/csv-analyzer.git
git branch -M main
git push -u origin main
```

## 🌐 무료 배포하기

### 옵션 1: Vercel (추천!)

1. **Vercel 가입**
   - https://vercel.com 접속
   - GitHub 계정으로 가입

2. **프로젝트 배포**
   - "New Project" 클릭
   - GitHub에서 `csv-analyzer` repository 선택
   - "Deploy" 클릭
   - 완료! (자동으로 URL 생성)

### 옵션 2: Netlify

1. **Netlify 가입**
   - https://netlify.com 접속
   - GitHub 계정으로 가입

2. **프로젝트 배포**
   - "New site from Git" 클릭
   - GitHub 선택, repository 선택
   - Build command: `npm run build`
   - Publish directory: `build`
   - "Deploy site" 클릭

### 옵션 3: GitHub Pages

1. **gh-pages 설치**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **package.json 수정** (이미 되어 있음)
   - homepage 필드를 본인 계정으로 수정:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/csv-analyzer"
   ```

3. **배포**
   ```bash
   npm run deploy
   ```

## ✅ 체크리스트

- [ ] Node.js 설치 완료
- [ ] 로컬에서 `npm install` 실행
- [ ] 로컬에서 `npm start`로 테스트
- [ ] GitHub 계정 생성
- [ ] GitHub Repository 생성
- [ ] Git으로 코드 업로드
- [ ] 배포 서비스 선택 (Vercel/Netlify/GitHub Pages)
- [ ] 배포 완료
- [ ] 배포된 URL에서 테스트

## 🎯 배포 후 확인사항

1. **파일 업로드** 기능 테스트
2. **분석 설정** 작동 확인
3. **T점수 계산** 정상 작동
4. **CSV 다운로드** 기능 확인
5. **모바일에서** 반응형 확인

## 🛠️ 문제 해결

### Node.js 설치 오류
- 관리자 권한으로 설치
- 기존 Node.js 제거 후 재설치

### npm install 오류
```bash
npm cache clean --force
npm install
```

### Git 업로드 오류
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 배포 실패
- package.json의 homepage URL 확인
- 빌드 오류 없는지 확인: `npm run build`

## 📞 도움말

문제가 생기면:
1. 터미널 오류 메시지 확인
2. GitHub Actions 로그 확인
3. 배포 서비스 로그 확인

---

🎉 **완료되면 전 세계 어디서든 CSV 분석 도구를 사용할 수 있습니다!**
