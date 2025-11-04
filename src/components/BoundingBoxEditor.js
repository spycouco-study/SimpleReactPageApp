import React, { useState, useRef, useEffect, useCallback } from 'react';
import './BoundingBoxEditor.css';

const BoundingBoxEditor = () => {
    const [image, setImage] = useState(null);
    const [boxes, setBoxes] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentBox, setCurrentBox] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [selectedBox, setSelectedBox] = useState(null);
    const [isResizing, setIsResizing] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [lastMouseEvent, setLastMouseEvent] = useState(null);
    const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 });
    
    const canvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const animationRef = useRef(null);

    // 이미지 업로드 처리
    const calculateImageDimensions = (imgWidth, imgHeight, maxWidth, maxHeight) => {
        let newWidth = imgWidth;
        let newHeight = imgHeight;
        
        // 이미지가 최대 크기를 초과하는 경우 비율을 유지하며 크기 조정
        if (newWidth > maxWidth) {
            newHeight = (maxWidth / newWidth) * newHeight;
            newWidth = maxWidth;
        }
        if (newHeight > maxHeight) {
            newWidth = (maxHeight / newHeight) * newWidth;
            newHeight = maxHeight;
        }
        
        return { width: newWidth, height: newHeight };
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // 에디터 섹션의 크기를 기준으로 최대 크기 계산
                const editorSection = canvasRef.current.parentElement;
                const maxWidth = editorSection.clientWidth - 40; // 패딩 고려
                const maxHeight = window.innerHeight * 0.7; // 화면 높이의 70%
                
                // 이미지 크기 계산
                const dimensions = calculateImageDimensions(img.width, img.height, maxWidth, maxHeight);
                
                // 메인 캔버스 설정
                const canvas = canvasRef.current;
                canvas.width = dimensions.width;
                canvas.height = dimensions.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

                // 미리보기 캔버스 초기 설정
                const previewCanvas = previewCanvasRef.current;
                previewCanvas.width = dimensions.width;
                previewCanvas.height = dimensions.height;

                // 이미지 객체에 계산된 크기 정보 추가
                img.displayWidth = dimensions.width;
                img.displayHeight = dimensions.height;
                setImage(img);
            };
            img.src = event.target.result;
        };
        
        if (file) {
            reader.readAsDataURL(file);
        }
    };

    // 마우스 이벤트 처리
    const handleMouseDown = (e) => {
        if (!image) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 선택된 박스의 리사이즈 핸들 체크
        if (selectedBox !== null) {
            const box = boxes[selectedBox];
            const handles = drawBox(canvas.getContext('2d'), box, selectedBox);
            const clickedHandle = getClickedHandle(x, y, handles);
            
            if (clickedHandle) {
                setIsResizing(true);
                setResizeHandle(clickedHandle);
                return;
            }
        }

        // 기존 박스 선택 체크
        const clickedBoxIndex = boxes.findIndex(box => isClickNearBox(x, y, box));
        if (clickedBoxIndex !== -1) {
            setSelectedBox(clickedBoxIndex);
            const box = boxes[clickedBoxIndex];
            const boxX = box.width > 0 ? box.startX : box.startX + box.width;
            const boxY = box.height > 0 ? box.startY : box.startY + box.height;
            setMoveOffset({
                x: x - boxX,
                y: y - boxY
            });
            setIsMoving(true);

            // Ctrl 키가 눌린 경우 박스 복제
            if (e.ctrlKey) {
                const newBox = { ...box };
                setBoxes(prev => [...prev, newBox]);
                setSelectedBox(boxes.length);
            }
            return;
        }

        // 새 박스 그리기 시작
        setSelectedBox(null);
        setIsDrawing(true);
        setCurrentBox({
            startX: x,
            startY: y,
            width: 0,
            height: 0
        });
    };

    const handleMouseMove = (e) => {
        if (!image) return;

        setLastMouseEvent(e);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 리사이즈 중
        if (isResizing && selectedBox !== null && resizeHandle) {
            const updatedBox = resizeBox(boxes[selectedBox], resizeHandle, x, y);
            setBoxes(prev => prev.map((box, i) => i === selectedBox ? updatedBox : box));
            drawCanvas();
            return;
        }

        // 박스 이동 중
        if (isMoving && selectedBox !== null) {
            const newX = x - moveOffset.x;
            const newY = y - moveOffset.y;
            
            setBoxes(prev => prev.map((box, i) => {
                if (i === selectedBox) {
                    const width = box.width;
                    const height = box.height;
                    return {
                        startX: newX,
                        startY: newY,
                        width,
                        height
                    };
                }
                return box;
            }));
            drawCanvas();
            return;
        }

        // 새 박스 그리기
        if (isDrawing && currentBox) {
            setCurrentBox(prev => ({
                ...prev,
                width: x - prev.startX,
                height: y - prev.startY
            }));
            drawCanvas();
        } else {
            drawCanvas();
        }
    };

    const handleMouseUp = () => {
        if (isResizing) {
            setIsResizing(false);
            setResizeHandle(null);
            return;
        }

        if (isMoving) {
            setIsMoving(false);
            return;
        }
        
        if (isDrawing && currentBox) {
            setIsDrawing(false);
            setBoxes(prev => [...prev, currentBox]);
            setCurrentBox(null);
            setSelectedBox(boxes.length); // 새로 그린 박스 선택
        }
    };

    // 캔버스 그리기
    const drawCanvas = useCallback(() => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // 캔버스 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 이미지를 캔버스 크기에 맞게 그리기
        ctx.drawImage(image, 0, 0, image.displayWidth, image.displayHeight);
        
        // 저장된 박스들 그리기
        boxes.forEach((box, index) => drawBox(ctx, box, index));
        
        // 현재 그리고 있는 박스 그리기
        if (currentBox) {
            drawBox(ctx, currentBox, boxes.length);
        }

        // 커서 스타일 설정
        if (selectedBox !== null && !isResizing) {
            const box = boxes[selectedBox];
            const handles = drawBox(ctx, box, selectedBox);
            const rect = canvas.getBoundingClientRect();
            const mouseX = lastMouseEvent?.clientX - rect.left;
            const mouseY = lastMouseEvent?.clientY - rect.top;

            if (mouseX && mouseY) {
                const clickedHandle = getClickedHandle(mouseX, mouseY, handles);
                if (clickedHandle) {
                    canvas.style.cursor = clickedHandle.cursor;
                } else {
                    canvas.style.cursor = 'move';
                }
            }
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }, [image, boxes, currentBox, selectedBox, isResizing, lastMouseEvent]);

    const drawBox = useCallback((ctx, box, index) => {
        const isSelected = selectedBox === index;
        const x = box.width > 0 ? box.startX : box.startX + box.width;
        const y = box.height > 0 ? box.startY : box.startY + box.height;
        const width = Math.abs(box.width);
        const height = Math.abs(box.height);

        // 박스 그리기
        ctx.strokeStyle = isSelected ? '#00FF00' : '#FF0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // 번호 표시
        ctx.fillStyle = isSelected ? '#00FF00' : '#FF0000';
        ctx.font = '16px Arial';
        const textMetrics = ctx.measureText(`${index + 1}`);
        const padding = 5;
        const textX = x + width - textMetrics.width - padding;
        const textY = y + height - padding;
        ctx.fillText(`${index + 1}`, textX, textY);

        // 선택된 박스의 경우 리사이즈 핸들 표시
        if (isSelected) {
            const handleSize = 8;
            const handles = [
                { x: x - handleSize/2, y: y - handleSize/2, cursor: 'nw-resize', position: 'nw' },
                { x: x + width - handleSize/2, y: y - handleSize/2, cursor: 'ne-resize', position: 'ne' },
                { x: x - handleSize/2, y: y + height - handleSize/2, cursor: 'sw-resize', position: 'sw' },
                { x: x + width - handleSize/2, y: y + height - handleSize/2, cursor: 'se-resize', position: 'se' }
            ];

            handles.forEach(handle => {
                ctx.fillStyle = '#00FF00';
                ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            });

            return handles;
        }

        return [];
    }, [selectedBox]);

    const isClickNearBox = (x, y, box) => {
        const boxX = box.width > 0 ? box.startX : box.startX + box.width;
        const boxY = box.height > 0 ? box.startY : box.startY + box.height;
        const width = Math.abs(box.width);
        const height = Math.abs(box.height);
        
        return x >= boxX - 5 && x <= boxX + width + 5 &&
               y >= boxY - 5 && y <= boxY + height + 5;
    };

    const getClickedHandle = (x, y, handles) => {
        return handles.find(handle => {
            const handleSize = 8;
            return x >= handle.x && x <= handle.x + handleSize &&
                   y >= handle.y && y <= handle.y + handleSize;
        });
    };

    const resizeBox = (box, handle, mouseX, mouseY) => {
        const originalBox = { ...box };
        
        switch (handle.position) {
            case 'nw':
                return {
                    ...box,
                    startX: mouseX,
                    startY: mouseY,
                    width: originalBox.startX + originalBox.width - mouseX,
                    height: originalBox.startY + originalBox.height - mouseY
                };
            case 'ne':
                return {
                    ...box,
                    startY: mouseY,
                    width: mouseX - box.startX,
                    height: originalBox.startY + originalBox.height - mouseY
                };
            case 'sw':
                return {
                    ...box,
                    startX: mouseX,
                    width: originalBox.startX + originalBox.width - mouseX,
                    height: mouseY - box.startY
                };
            case 'se':
                return {
                    ...box,
                    width: mouseX - box.startX,
                    height: mouseY - box.startY
                };
            default:
                return box;
        }
    };

    // 애니메이션 재생
    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    // 키보드 이벤트 핸들러
    const handleKeyDown = (e) => {
        if (selectedBox === null || !boxes[selectedBox]) return;

        const MOVE_STEP = 1; // 기본 이동 단위 (픽셀)
        const MOVE_STEP_FAST = 5; // Shift 키와 함께 누를 때의 이동 단위
        
        const step = e.shiftKey ? MOVE_STEP_FAST : MOVE_STEP;
        const box = boxes[selectedBox];
        let newBox = { ...box };

        switch (e.key) {
            case 'ArrowLeft':
                newBox.startX -= step;
                e.preventDefault();
                break;
            case 'ArrowRight':
                newBox.startX += step;
                e.preventDefault();
                break;
            case 'ArrowUp':
                newBox.startY -= step;
                e.preventDefault();
                break;
            case 'ArrowDown':
                newBox.startY += step;
                e.preventDefault();
                break;
            default:
                return;
        }

        setBoxes(prev => prev.map((b, i) => i === selectedBox ? newBox : b));
        drawCanvas();
    };

    // 키보드 이벤트 리스너 등록
    useEffect(() => {
        const keyHandler = (e) => {
            if (selectedBox === null || !boxes[selectedBox]) return;

            const MOVE_STEP = 1; // 기본 이동 단위 (픽셀)
            const MOVE_STEP_FAST = 5; // Shift 키와 함께 누를 때의 이동 단위
            
            const step = e.shiftKey ? MOVE_STEP_FAST : MOVE_STEP;
            const box = boxes[selectedBox];
            let newBox = { ...box };

            switch (e.key) {
                case 'ArrowLeft':
                    newBox.startX -= step;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    newBox.startX += step;
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    newBox.startY -= step;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    newBox.startY += step;
                    e.preventDefault();
                    break;
                default:
                    return;
            }

            setBoxes(prev => prev.map((b, i) => i === selectedBox ? newBox : b));
            drawCanvas();
        };

        window.addEventListener('keydown', keyHandler);
        return () => {
            window.removeEventListener('keydown', keyHandler);
        };
    }, [selectedBox, boxes, drawCanvas]); // drawCanvas 함수도 의존성에 추가

    // 애니메이션 재생 효과
    useEffect(() => {
        if (isPlaying && boxes.length > 0) {
            const animate = () => {
                setCurrentFrame(prev => (prev + 1) % boxes.length);
            };
            
            const intervalId = setInterval(animate, 500);
            return () => clearInterval(intervalId);
        }
    }, [isPlaying, boxes.length]);

    useEffect(() => {
        if (image && previewCanvasRef.current && boxes.length > 0) {
            const canvas = previewCanvasRef.current;
            const ctx = canvas.getContext('2d');
            const currentBox = boxes[currentFrame];
            
            // 이미지의 원본 크기와 표시 크기의 비율 계산
            const scaleX = image.width / image.displayWidth;
            const scaleY = image.height / image.displayHeight;
            
            // 표시된 박스의 크기를 원본 이미지 크기로 변환
            const boxWidth = Math.abs(currentBox.width) * scaleX;
            const boxHeight = Math.abs(currentBox.height) * scaleY;
            
            // 박스의 시작 좌표를 원본 이미지 크기로 변환
            const sourceX = (currentBox.width > 0 ? currentBox.startX : currentBox.startX + currentBox.width) * scaleX;
            const sourceY = (currentBox.height > 0 ? currentBox.startY : currentBox.startY + currentBox.height) * scaleY;
            
            // 미리보기 캔버스 크기 설정 (표시 크기 기준)
            const displayBoxWidth = Math.abs(currentBox.width);
            const displayBoxHeight = Math.abs(currentBox.height);
            canvas.width = displayBoxWidth;
            canvas.height = displayBoxHeight;
            
            // 박스 영역만 잘라서 그리기
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(
                image,
                sourceX, sourceY,  // 원본 이미지에서 잘라낼 영역의 시작점
                boxWidth, boxHeight,  // 원본 이미지에서 잘라낼 영역의 크기
                0, 0,  // 캔버스에 그릴 위치
                displayBoxWidth, displayBoxHeight  // 캔버스에 그릴 크기
            );
        }
    }, [currentFrame, image, boxes]);

    return (
        <div className="bounding-box-editor">
            <div className="editor-section">
                <input type="file" accept="image/*" onChange={handleImageUpload} />
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
            <div className="preview-section">
                <canvas ref={previewCanvasRef} />
                <div className="controls">
                    <button onClick={togglePlay}>
                        {isPlaying ? '정지' : '재생'}
                    </button>
                    <span>프레임: {currentFrame + 1} / {boxes.length}</span>
                </div>
            </div>
        </div>
    );
};

export default BoundingBoxEditor;
