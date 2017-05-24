(function(window,angular,undefined) {

    'use strict';

    var npDoc = [];
    var npLastPage = [];
    var npNumPage = [];
    var npFileSize = [];
    var npMove = [];
    var npFileTmp = [];

    var genLfObjId = function(){
    	return 	'lfobjyxxxxxxxx'.replace(/[xy]/g, function(c) {
	    			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    			return v.toString(16);
				});
    };

    var parseFileType = function (file){
        var type =  file.type;
        var name =  file.name;
        if(isImageType(type,name)){
            return "image";
        }else if(isVideoType(type,name)){
            return "video";
        }else if(isAudioType(type,name)){
            return "audio";
        }else if(isPdfTypeIE(type,name)){
            return "pdfIE";
        }
        return "object";
    };

    var isInternetExplorer = function(){
        /* For diferent's browsers */
        if(navigator.userAgent.toLowerCase().indexOf("msie") >= 0 || navigator.userAgent.toLowerCase().indexOf("trident") >= 0)
            return true;
        else
            return false;
    };
    var isImageType = function(type,name){
        return (type.match('image.*') || name.match(/\.(gif|png|jpe?g)$/i)) ? true : false;
    };

    var isVideoType = function(type,name){
        return (type.match('video.*') || name.match(/\.(og?|mp4|webm|3gp)$/i)) ? true : false;
    };

    var isAudioType = function(type,name){
        return (type.match('audio.*') || name.match(/\.(ogg|mp3|wav)$/i)) ? true : false;
    };

    var isPdfTypeIE = function(type,name){
        return (type.match('application/pdf') && name.match(/\.(pdf)$/i)) ? true : false;
    };

    var genLfFileObj = function(file,typedarray) {
        var lfFileObj = {
            "key":genLfObjId(),
            "lfFile":file,
            "lfFileName":file.name,
            "lfFileType":file.type,
            "lfFileSize":parseInt((file.size/1024/1024)*100)/100,
            "lfTagType":parseFileType(file),
            "lfDataUrl":window.URL.createObjectURL(file),
            "lfUint8Array": typedarray,
            "isRemote":false
        };
        return lfFileObj;
    };

    var genRemoteLfFileObj = function(url, fileName, fileType) {
        var vitrualFile = {
            "name":fileName,
            "type":fileType
        };
        var lfFileObj = {
            "key":genLfObjId(),
            "lfFile":void 0,
            "lfFileName":fileName,
            "lfFileType":fileType,
            "lfTagType":parseFileType(vitrualFile),
            "lfDataUrl":url,
            "isRemote":true
        };
        return lfFileObj;
    };

    var renderPDF = function(url, scope, options) {
      var canvasContainer = document.getElementById('_'+scope.lfFileObj.key);
        var divContainer = document.getElementById('_div_'+scope.lfFileObj.key);
        if(!divContainer) {
          divContainer = document.createElement('div');
          divContainer.id = '_div_'+scope.lfFileObj.key;
          canvasContainer.appendChild(divContainer);
        }
        divContainer.innerHTML = "";
        angular.element(divContainer).bind('mousedown', function(e){
          var x=e.clientX||e.layerX||0;
          var y=e.clientY||e.layerY||0;
          npMove[scope.lfFileObj.key] = {x:x,y:y};
        });
        angular.element(divContainer).bind('mouseup', function(e){
          npMove[scope.lfFileObj.key] = null;
        });
        angular.element(divContainer).bind('mouseout', function(e){
          npMove[scope.lfFileObj.key] = null;
        });
        angular.element(divContainer).bind('mousemove', function(e){
          if(npMove[scope.lfFileObj.key]&&npMove[scope.lfFileObj.key].x){
            var x=e.clientX||e.layerX||0;
            var y=e.clientY||e.layerY||0;
            canvasContainer.scrollTop-=(y-npMove[scope.lfFileObj.key].y);
            canvasContainer.scrollLeft-=(x-npMove[scope.lfFileObj.key].x);
            npMove[scope.lfFileObj.key] = {x:x,y:y};
          }
        });
        options = options || { scale: 1 };

        function renderPage(page) {
            var viewport = page.getViewport(options.scale);
            var canvas = document.createElement('canvas');
              canvas.className = 'canvasClass';
              angular.element(canvas).css('width','80%');
            var ctx = canvas.getContext('2d');
            var renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };

            canvas.height = viewport.height;
            canvas.width = viewport.width;
            divContainer.appendChild(canvas);

            var task = page.render(renderContext);
            task.promise.then(function(){
              if(npNumPage[scope.lfFileObj.key]===0){
                npDoc[scope.lfFileObj.key] = new jsPDF('p','pt',[canvas.width, canvas.height]);
                npDoc[scope.lfFileObj.key].deletePage(1);
                npDoc[scope.lfFileObj.key].addPage(canvas.width, canvas.height);
              }
              var img = new Image();
              img.src = canvas.toDataURL('image/jpeg', 1.0);
              npDoc[scope.lfFileObj.key].addImage(img.src, 'jpeg', 0, 0, canvas.width, canvas.height);
              npNumPage[scope.lfFileObj.key]++;
              if(npNumPage[scope.lfFileObj.key]>=npLastPage[scope.lfFileObj.key]) {
                npFileSize[scope.lfFileObj.key] = npDoc[scope.lfFileObj.key].output().length;
                //npDoc[scope.lfFileObj.key].save('reducido.pdf');
              }else{
                npDoc[scope.lfFileObj.key].addPage(canvas.width, canvas.height);
              }
            });
        }

        function renderPages(pdfDoc) {
          npNumPage[scope.lfFileObj.key] = 0;
          npLastPage[scope.lfFileObj.key] = pdfDoc.numPages;
          for(var num = 1; num <= pdfDoc.numPages; num++) {
            pdfDoc.getPage(num).then(renderPage);
          }
        }
        PDFJS.disableWorker = true;
        PDFJS.getDocument(url).then(renderPages);
    };

    var lfNgMdFileinput = angular.module('lfNgMdFileInput', ['ngMaterial']);

    lfNgMdFileinput.directive('lfFile', function() {
        return {
            restrict: 'E',
            scope: {
                lfFileObj: '=',
                lfUnknowClass: '='
            },
            link: function(scope, element, attrs) {
                var src = scope.lfFileObj.lfDataUrl;
                var fileType = scope.lfFileObj.lfFileType;
                var tagType = scope.lfFileObj.lfTagType;
                var unKnowClass = scope.lfUnknowClass;
                switch(tagType){
                    case 'image': {
                        element.replaceWith(
                            '<img src="' + src + '" />'
                        );
                        break;
                    }
                    case 'video': {
                        element.replaceWith(
                            '<video controls>' +
                                '<source src="' + src + '"">' +
                            '</video>'
                        );
                        break;
                    }
                    case 'audio': {
                        element.replaceWith(
                            '<audio controls>' +
                                '<source src="' + src + '"">' +
                            '</audio>'
                        );
                        break;
                    }
                    case 'pdfIE': {
                        element.replaceWith(
                            '<div id="_' + scope.lfFileObj.key + '" class="canvas-container">' +
                            //'<canvas id="' + scope.lfFileObj.lfFileName + '">' +
                            '</div>'
                        );
                        renderPDF(scope.lfFileObj.lfUint8Array, scope);
                        break;
                    }
                    default : {
                        if(scope.lfFileObj.lfFile == void 0){
                            fileType = 'unknown/unknown';
                        }
                        element.replaceWith(
                            '<object type="' + fileType + '" data="' + src + '">' +
                                '<div class="lf-ng-md-file-input-preview-default">' +
                                    '<md-icon class="lf-ng-md-file-input-preview-icon '+unKnowClass+'"></md-icon>' +
                                '</div>' +
                            '</object>'
                        );
                    }
                }
            }
        };
    });

    lfNgMdFileinput.run(function($templateCache){
        $templateCache.put('lfNgMdFileinput.html', [
            '<div layout="column" class="lf-ng-md-file-input" ng-model="'+genLfObjId()+'">',
                '<div layout="column" class="lf-ng-md-file-input-preview-container" ng-class="{\'disabled\':isDisabled}" ng-show="isDrag || (isPreview && lfFiles.length)">',
                    '<md-button aria-label="remove all files" class="close lf-ng-md-file-input-x" ng-click="removeAllFiles($event)" ng-hide="!lfFiles.length || !isPreview" >&times;</md-button>',
                    '<div class="lf-ng-md-file-input-drag">',
                        '<div layout="row" layout-align="center center" class="lf-ng-md-file-input-drag-text-container" ng-show="(!lfFiles.length || !isPreview) && isDrag">',
                            '<div class="lf-ng-md-file-input-drag-text">{{strCaptionDragAndDrop}}</div>',
                        '</div>',
                        '<div class="lf-ng-md-file-input-thumbnails" ng-if="isPreview == true">',
                            '<div class="lf-ng-md-file-input-frame" ng-repeat="lffile in lfFiles" ng-click="onFileClick(lffile)" ng-mouseover="isPdfImg(lffile.key)">',
                                '<div ng-if="lffile.lfFileSize" style="position:absolute;text-align:left;">',
                                  '<div style="margin-top:-2px">',
                                    '<button id="lf-zoomImgIn" ng-click="lfCanvasZoom(lffile.key,20)"></button> ',
                                    '<button id="lf-zoomImgOut" ng-click="lfCanvasZoom(lffile.key,-20)"></button> ',
                                    '<button id="lf-downloadImg" ng-click="savePdfImg(lffile.key)" title="{{strCaptionSaveJpgPdf}} {{toPdfImg[lffile.key]}} MiB" ng-if="toPdfImg[lffile.key]"></button> ',
                                    '<span ng-if="toPdfImg[lffile.key]">&nbsp; <input type="checkbox" ng-click="sendPdfImg(lffile.key,this)" title="">{{strCaptionSendJpgPdf}} {{toPdfImg[lffile.key]}} MiB</span>',
                                    '</div>',
                                '</div>',
                                '<div class="lf-ng-md-file-input-x" aria-label="remove {{lffile.lfFileName}}" ng-click="removeFile(lffile,$event)">&times;</div>',
                                '<lf-file lf-file-obj="lffile" lf-unknow-class="strUnknowIconCls"/>',
                                // '<md-progress-linear md-mode="indeterminate"></md-progress-linear>',
                                '<div class="lf-ng-md-file-input-frame-footer">',
                                    '<div class="lf-ng-md-file-input-frame-caption">{{lffile.lfFileName}}</div>',
                                    '<div class="lf-ng-md-file-input-frame-caption" ng-if="lffile.lfFileSize" style="width:100%">{{lffile.lfFileSize}} MiB</div>',
                                '</div>',
                            '</div>',
                        '</div>',
                        '<div class="clearfix" style="clear:both"></div>',
                    '</div>',
                '</div>',
                '<div layout="row" class="lf-ng-md-file-input-container" >',
                    '<div class="lf-ng-md-file-input-caption" layout="row" layout-align="start center" flex ng-class="{\'disabled\':isDisabled}" >',
                        '<md-icon class="lf-icon" ng-class="strCaptionIconCls"></md-icon>',
                        '<div flex class="lf-ng-md-file-input-caption-text-default" ng-show="!lfFiles.length">',
                            '{{strCaptionPlaceholder}}',
                        '</div>',
                        '<div flex class="lf-ng-md-file-input-caption-text" ng-hide="!lfFiles.length">',
                            '<span ng-if="isCustomCaption">{{strCaption}}</span>',
                            '<span ng-if="!isCustomCaption">',
                                '{{ lfFiles.length == 1 ? lfFiles[0].lfFileName : lfFiles.length+" files selected" }}',
                            '</span>',
                        '</div>',
                        '<md-progress-linear md-mode="determinate" value="{{floatProgress}}" ng-show="intLoading && isProgress"></md-progress-linear>',
                    '</div>',
                    '<md-button aria-label="remove all files" ng-disabled="isDisabled" ng-click="removeAllFiles()" ng-hide="!lfFiles.length || intLoading" class="md-raised lf-ng-md-file-input-button lf-ng-md-file-input-button-remove" >',
                        '<md-icon class="lf-icon" ng-class="strRemoveIconCls"></md-icon> ',
                        '{{strCaptionRemove}}',
                    '</md-button>',
                    '<md-button ng-disabled="isDisabled" ng-click="openDialog($event, this)" class="md-raised md-primary lf-ng-md-file-input-button lf-ng-md-file-input-button-brower" >',
                        '<md-icon class="lf-icon" ng-class="strBrowseIconCls"></md-icon> ',
                        '{{strCaptionBrowse}}',
                        '<input type="file" aria-label="{{strAriaLabel}}" accept="{{accept}}" ng-disabled="isDisabled" class="lf-ng-md-file-input-tag" />',
                    '</md-button>',
                '</div>',
            '</div>'
        ].join(''));
    });

    lfNgMdFileinput.filter('lfTrusted', ['$sce', function ($sce) {
        return function(url) {
            return $sce.trustAsResourceUrl(url);
        };
    }]);

    lfNgMdFileinput.directive('lfRequired', function() {
        return {
            restrict: "A",
            require:"ngModel",
            link: function(scope, element, attrs, ctrl) {
            	if (!ctrl) {
            		return;
      			}
      			ctrl.$validators.required = function(modelValue,viewValue) {
      				if(!modelValue){
      					return false;
      				}
        			return modelValue.length>0;
      			};
            }
        };
    });

    lfNgMdFileinput.directive('lfMaxcount', function() {
        return {
            restrict: "A",
            require:"ngModel",
            link: function(scope, element, attrs ,ctrl) {
            	if (!ctrl) {
            		return;
      			}
            	var intMax = -1;
				attrs.$observe('lfMaxcount', function(value) {
					var intVal = parseInt(value,10);
					intMax = isNaN(intVal) ? -1 : intVal;
					ctrl.$validate();
				});
                ctrl.$validators.maxcount = function(modelValue,viewValue) {
                	if(!modelValue){
      					return false;
      				}
                    return modelValue.length <= intMax;
                };
            }
        };
    });

    lfNgMdFileinput.directive('lfFilesize', function() {
        return {
            restrict: "A",
            require:"ngModel",
            link: function(scope, element, attrs ,ctrl) {
            	if (!ctrl) {
            		return;
      			}
            	var intMax = -1;
				attrs.$observe('lfFilesize', function(value) {
					var reg = /^[1-9][0-9]*(Byte|KB|MB)$/;
					if(!reg.test(value)){
						intMax = -1;
					}else{
						var sizes = ['Byte', 'KB', 'MB'];
						var unit = value.match(reg)[1];
						var number = value.substring(0,value.indexOf(unit));
						sizes.every(function(obj,idx){
							if(unit === obj){
								intMax = parseInt(number)*Math.pow(1024,idx);
								return false;
							}else{
								return true;
							}
						});
					}
					ctrl.$validate();
				});
                ctrl.$validators.filesize = function(modelValue,viewValue) {
                	if(!modelValue){
      					return false;
      				}
      				var boolValid = true;
      				modelValue.every(function(obj,idx){
      					if(obj.lfFile.size > intMax){
      						boolValid = false;
      						return false;
      					}else{
      						return true;
      					}
      				});
      				return boolValid;
                };
            }
        };
    });

	lfNgMdFileinput.directive('lfTotalsize', function() {
        return {
            restrict: "A",
            require:"ngModel",
            link: function(scope, element, attrs ,ctrl) {
            	if (!ctrl) {
            		return;
      			}
            	var intMax = -1;
				attrs.$observe('lfTotalsize', function(value) {
					var reg = /^[1-9][0-9]*(Byte|KB|MB)$/;
					if(!reg.test(value)){
						intMax = -1;
					}else{
						var sizes = ['Byte', 'KB', 'MB'];
						var unit = value.match(reg)[1];
						var number = value.substring(0,value.indexOf(unit));
						sizes.every(function(obj,idx){
							if(unit === obj){
								intMax = parseInt(number)*Math.pow(1024,idx);
								return false;
							}else{
								return true;
							}
						});
					}
					ctrl.$validate();
				});
                ctrl.$validators.totalsize = function(modelValue,viewValue) {
                	if(!modelValue){
      					return false;
      				}
      				var intTotal = 0;
      				angular.forEach(modelValue,function(obj,idx){
      					intTotal = intTotal + obj.lfFile.size;
      				});
      				return intTotal < intMax;
                };
            }
        };
    });

    lfNgMdFileinput.directive('lfMimetype', function() {
        return {
            restrict: "A",
            require:"ngModel",
            link: function(scope, element, attrs ,ctrl) {
                if (!ctrl) {
                    return;
                }
                var reg;
                attrs.$observe('lfMimetype', function(value) {
                    var lfAccept = value.replace(/,/g,'|');
                    reg = new RegExp(lfAccept, "i");
                    ctrl.$validate();
                });
                ctrl.$validators.mimetype = function(modelValue,viewValue) {
                    if(!modelValue){
                        return false;
                    }
                    var boolValid = true;
                    modelValue.every(function(obj,idx){
                        if(obj.lfFile.type.match(reg)){
                            return true;
                        }else{
                            boolValid = false;
                            return false;
                        }
                    });
                    return boolValid;
                };
            }
        };
    });

    lfNgMdFileinput.directive('lfNgMdFileInput',['$q','$compile','$timeout', function($q,$compile,$timeout){
        return {
            restrict: 'E',
            templateUrl: 'lfNgMdFileinput.html',
            replace: true,
            require:"ngModel",
            scope:{
                lfFiles:'=?',
                lfApi:'=?',
                lfOption:'=?',
                lfCaption:'@?',
                lfPlaceholder:'@?',
				lfDragAndDropLabel:'@?',
				lfBrowseLabel: '@?',
				lfRemoveLabel: '@?',
        lfSaveJpgPdfLabel: '@?',
        lfSendJpgPdfLabel: '@?',
                lfOnFileClick: '=?',
                lfOnFileRemove: '=?',
                accept:'@?',
                ngDisabled:'=?'
            },
            link: function(scope,element,attrs,ctrl){

                var elFileinput = angular.element(element[0].querySelector('.lf-ng-md-file-input-tag'));
                var elDragview  = angular.element(element[0].querySelector('.lf-ng-md-file-input-drag'));
                var elThumbnails = angular.element(element[0].querySelector('.lf-ng-md-file-input-thumbnails'));
                var intFilesCount = 0;

                scope.intLoading = 0;
                scope.floatProgress = 0;

                scope.isPreview = false;
                scope.isDrag = false;
                scope.isMutiple = false;
                scope.isProgress = false;
                scope.isCustomCaption = false;

                if(angular.isDefined(attrs.preview)){
                    scope.isPreview = true;
                }

                if(angular.isDefined(attrs.drag)){
                    scope.isDrag = true;
                }

                if(angular.isDefined(attrs.multiple)){
                    elFileinput.attr('multiple','multiple');
                    scope.isMutiple = true;
                }else{
                    elFileinput.removeAttr('multiple');
                }

                if(angular.isDefined(attrs.progress)){
                    scope.isProgress = true;
                }

                scope.isDisabled = false;

                if (angular.isDefined(attrs.ngDisabled) ) {
                    scope.$watch('ngDisabled', function(isDisabled) {
                        scope.isDisabled = isDisabled;
                    });
                }

                scope.strBrowseIconCls = "lf-browse";
                scope.strRemoveIconCls = "lf-remove";
                scope.strCaptionIconCls = "lf-caption";
                scope.strUnknowIconCls = "lf-unknow";

                if(angular.isDefined(attrs.lfOption)){
                    if(angular.isObject(scope.lfOption)){
                        if(scope.lfOption.hasOwnProperty('browseIconCls')){
                            scope.strBrowseIconCls = scope.lfOption.browseIconCls;
                        }
                        if(scope.lfOption.hasOwnProperty('removeIconCls')){
                            scope.strRemoveIconCls = scope.lfOption.removeIconCls;
                        }
                        if(scope.lfOption.hasOwnProperty('captionIconCls')){
                            scope.strCaptionIconCls = scope.lfOption.captionIconCls;
                        }
                        if(scope.lfOption.hasOwnProperty('unknowIconCls')){
                            scope.strUnknowIconCls = scope.lfOption.unknowIconCls;
                        }
                    }
                }

                scope.accept = scope.accept || '';

                scope.lfFiles = [];

                scope[attrs.ngModel] = scope.lfFiles;

                scope.lfApi = new function(){
                    var self = this;
                    self.removeAll = function(){
                        scope.removeAllFiles();
                    };

                    self.removeByName = function(name){
                        scope.removeFileByName(name);
                    };

                    self.addRemoteFile = function(url, name, type){
                        var obj = genRemoteLfFileObj(url, name, type);
                        scope.lfFiles.push(obj);
                    };
                };

                scope.strCaption = '';

                scope.strCaptionPlaceholder = 'Select file';

				scope.strCaptionDragAndDrop = 'Drag & drop files here...';

				scope.strCaptionBrowse = 'Browse';

				scope.strCaptionRemove = 'Remove';

        scope.strCaptionSaveJpgPdf = 'Save reduced ';

        scope.strCaptionSendJpgPdf = 'Send reduced ';

                scope.strAriaLabel = "";

                if (angular.isDefined(attrs.ariaLabel)) {
                    scope.strAriaLabel = attrs.ariaLabel;
                }

                if(angular.isDefined(attrs.lfPlaceholder)){
                    scope.$watch('lfPlaceholder', function(newVal) {
                        scope.strCaptionPlaceholder = newVal;
                    });
                }

                if (angular.isDefined(attrs.lfCaption) ) {
                    scope.isCustomCaption = true;
                    scope.$watch('lfCaption', function(newVal) {
                        scope.strCaption = newVal;
                    });
                }

				if(scope.lfDragAndDropLabel){
					scope.strCaptionDragAndDrop = scope.lfDragAndDropLabel;
				}

				if(scope.lfBrowseLabel){
					scope.strCaptionBrowse = scope.lfBrowseLabel;
				}

				if(scope.lfRemoveLabel){
					scope.strCaptionRemove = scope.lfRemoveLabel;
				}

        if(scope.lfSaveJpgPdfLabel){
					scope.strCaptionSaveJpgPdf = scope.lfSaveJpgPdfLabel;
				}

        if(scope.lfSendJpgPdfLabel){
					scope.strCaptionSendJpgPdf = scope.lfSendJpgPdfLabel;
				}

                scope.openDialog = function(event, el) {
					if(event){
						$timeout(function() {
							event.preventDefault();
							event.stopPropagation();
							var children = event.target.children[2];
							if(children !== undefined) {
								elFileinput[0].click();
							}
						}, 0);
					}
				};

        scope.savePdfImg = function(fkey) {
          var ik=0; scope.lfFiles.some(function(o,i){ik=i;return (o.key==fkey);});
          var newFileName = scope.lfFiles[ik].lfFileName.replace('.pdf','.'+fkey)+'.pdf';
          npDoc[fkey].save(newFileName);
          //scope.removeAllFiles();
        };

        scope.sendPdfImg = function(fkey) {
          var ik=0, isFile = scope.lfFiles.some(function(o,i){ik=i;return (o.key==fkey);});
          if(npDoc[fkey] && isFile) {
            if(scope.lfFiles[ik].lfFileName.indexOf('.'+fkey+'.pdf') < 0) {
              var filename = scope.lfFiles[ik].lfFileName.replace('.pdf','.'+fkey+'.pdf');
              npFileTmp[ik] = {
                "lfFile":scope.lfFiles[ik].lfFile,
                "lfFileSize":scope.lfFiles[ik].lfFileSize,
                "lfFileName":scope.lfFiles[ik].lfFileName
              };
              scope.lfFiles[ik].lfFile = new File([npDoc[fkey].output('blob')], filename, {type: "application/pdf"} );
              scope.lfFiles[ik].lfFileSize = parseInt((npFileSize[fkey]/1024/1024)*100)/100;
              scope.lfFiles[ik].lfFileName = filename;
              //scope.toPdfImg[fkey] = false;
            }else{
              scope.lfFiles[ik].lfFile = npFileTmp[ik].lfFile;
              scope.lfFiles[ik].lfFileSize = npFileTmp[ik].lfFileSize;
              scope.lfFiles[ik].lfFileName = npFileTmp[ik].lfFileName;
            }
            ctrl.$validate();
          }
        };

        scope.lfCanvasZoom = function(fkey,zoom) {
          var ik=0; scope.lfFiles.some(function(o,i){ik=i;return (o.key==fkey);});
          var divContainer = document.getElementById('_div_'+fkey);
          var a = angular.element(divContainer.children).css('width');
          var b = angular.element(divContainer).css('width');
          var porcentaje = parseInt(a.replace('%','').replace('px',''));
          if(a.indexOf('px')>=0) {
            porcentaje = parseInt(a.replace('px','')) * 100 / parseInt(b.replace('px',''));
          }
          porcentaje += zoom;
          if(10<porcentaje && porcentaje<200) {
            angular.element(divContainer.children).css('width',porcentaje+'% ');
          }
        };

        scope.isPdfImg = function(fkey) {
          var ik=0; scope.lfFiles.some(function(o,i){ik=i;return (o.key==fkey);});
          if(npFileSize[fkey] <= scope.lfFiles[ik].lfFile.size) {
            scope.toPdfImg[fkey] = parseInt((npFileSize[fkey]/1024/1024)*100)/100;
          } else {
            scope.toPdfImg[fkey] = false;
          }
          if(isInternetExplorer()) {
            scope.toPdfImg[fkey] = false;
          }
        };

        scope.toPdfImg = [];

				scope.removeAllFiles = function(event){
          scope.toPdfImg = [];
					if(scope.isDisabled){
						return;
					}
					scope.lfFiles.length = 0;
					elThumbnails.empty();
                    executeValidate();
				};

				scope.removeFileByName = function(name,event){
					if(scope.isDisabled){
						return;
					}
					scope.lfFiles.every(function(obj,idx){
						if(obj.lfFileName == name){
							scope.lfFiles.splice(idx,1);
							return false;
						}
						return true;
					});
                    executeValidate();
				};

                scope.removeFile = function(lfFile) {
                    scope.lfFiles.every(function(obj,idx){
						if(obj.key == lfFile.key){
                            if(angular.isFunction(scope.lfOnFileRemove)){
                                scope.lfOnFileRemove(obj,idx);
                            }
							scope.lfFiles.splice(idx,1);
							return false;
						}
						return true;
					});
                    executeValidate();
                };
                //call back function
                scope.onFileClick = function(lfFile) {
                    if(angular.isFunction(scope.lfOnFileClick)){
                        scope.lfFiles.every(function(obj,idx){
                            if(obj.key == lfFile.key){
                                scope.lfOnFileClick(obj,idx);
                                return false;
                            }else{
                                return true;
                            }
                        });
                    }
                };

                // scope.onFileRemove =

                elDragview.bind("dragover", function(e){
                    e.stopPropagation();
                    e.preventDefault();
                    if(scope.isDisabled || !scope.isDrag){
                        return;
                    }
                    elDragview.addClass("lf-ng-md-file-input-drag-hover");
                });

				elDragview.bind("dragleave", function(e){
					e.stopPropagation();
					e.preventDefault();
					if(scope.isDisabled || !scope.isDrag){
						return;
					}
					elDragview.removeClass("lf-ng-md-file-input-drag-hover");
				});

				elDragview.bind("drop", function(e){
					e.stopPropagation();
					e.preventDefault();
					if(scope.isDisabled || !scope.isDrag){
						return;
					}
					elDragview.removeClass("lf-ng-md-file-input-drag-hover");
                    if(angular.isObject(e.originalEvent)){
                        e = e.originalEvent;
                    }
					var files = e.target.files || e.dataTransfer.files;
					var i = 0;
                    var lfAccept = scope.accept.replace(/,/g,'|');
					var regexp = new RegExp(lfAccept, "i");
                    var regFiles = [];
                    angular.forEach(files,function(file,idx){
      					if(file.type.match(regexp)) {
                            regFiles.push(file);
                        }
      				});
                    onFileChanged(regFiles);
				});

                elFileinput.bind("change",function(e) {
                    var files = e.files || e.target.files;
                    onFileChanged(files);
                });

                var onFileChanged = function(files) {
					if(files.length <= 0){
						return;
					}
                    var names = scope.lfFiles.map(function(obj){
                        return obj.lfFileName;
                    });
                    var i,file;
                    scope.floatProgress = 0;
					if(scope.isMutiple){
                        intFilesCount = files.length;
                        scope.intLoading = intFilesCount;
                        for(i=0;i<files.length;i++){
                            file = files[i];
                            setTimeout(readFile(files[i]), i*100);
                        }
                    }else{
                        intFilesCount = 1;
                        scope.intLoading = intFilesCount;
                        for(i=0;i<files.length;i++){
                            file = files[i];
                            scope.removeAllFiles();
                            readFile(file);
                            break;
                        }
                    }
					elFileinput.val('');
        };

                var executeValidate = function() {
                    ctrl.$validate();
                };

				var readFile = function(file){
					readAsDataURL(file).then(function(result){

                        var typedarray = new Uint8Array(result.result);
                        var isFileAreadyExist = false;

                        scope.lfFiles.every(function(obj,idx){
                            var lfFile = obj.lfFile;
							if(lfFile.name == file.name) {
								if(lfFile.size == file.size) {
                                    if(lfFile.lastModified == file.lastModified) {
                                        isFileAreadyExist = true;
                                    }
                                }
								return false;
							}else{
								return true;
							}
						});

                        if(!isFileAreadyExist){
                            var obj = genLfFileObj(file,typedarray);
						    scope.lfFiles.push(obj);
                        }
                        if(scope.intLoading===0) {
                            executeValidate();
                        }
					},function(error){

					},function(notify){

					});
				};

				var readAsDataURL = function (file,index) {

					var deferred = $q.defer();

					var reader = new FileReader();

					reader.onloadstart = function(){
						deferred.notify(0);
					};

					reader.onload = function(event){

					};

					reader.onloadend = function(event){
						deferred.resolve({
							'index':index,
							'result':reader.result
						});
                        scope.intLoading--;
                        scope.floatProgress = (intFilesCount-scope.intLoading)/intFilesCount*100;
					};

					reader.onerror = function(event){
						deferred.reject(reader.result);
                        scope.intLoading--;
                        scope.floatProgress = (intFilesCount-scope.intLoading)/intFilesCount*100;
					};

					reader.onprogress = function(event){
						deferred.notify(event.loaded/event.total);
					};

					reader.readAsArrayBuffer(file);

					return deferred.promise;
				};

			}

		};

    }]);

})(window,window.angular);
