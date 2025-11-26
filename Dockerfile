# Build stage
FROM node:18-alpine AS build

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm i

# 소스 코드 복사
COPY . .

# 프로덕션 빌드
RUN npm run build

CMD ["npm", "start"]

# Production stage
# FROM nginx:alpine

# Nginx 설정 파일 복사 (선택사항)
# COPY nginx.conf /etc/nginx/nginx.conf

# 빌드된 정적 파일을 Nginx의 기본 경로로 복사
# COPY --from=build /app/build /usr/share/nginx/html

# # 포트 노출
# EXPOSE 3000

# # Nginx 실행
# CMD ["nginx", "-g", "daemon off;"]
