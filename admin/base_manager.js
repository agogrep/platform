function getFileList() {
  $('html,body').addClass('waiting-indicator');
  var out = [
        {
          target:{
                  module:'serverman',
                  class:'Control',
            },
          param : {
              _line: 'getAllFile'  // getLocalFileList  getFtpFileList
              }
        }
  ]
  var call = [(input)=>{
    // console.log('input',input);
    var box = $('#list_box');
    box.empty();
    // list = input[0].content
    // console.log(box);
    for (var storage in input[0].content) {
      $('html,body').removeClass('waiting-indicator');
      var list = input[0].content[storage];
      list.forEach((el,i)=>{
        var link = $('<div class = "linkrow">'+
                    '<p class = "name">'+el[0]+'</p>'+
                    '<p class = "byte">'+el[1]+' byte</p>'+
                    '<p class = "storage">'+storage+'</p>'+
                    '</div>'
      );
        link.click((ev)=>{

              var thisEl = $(ev.target);
              if (!thisEl.hasClass('linkrow')) {thisEl = thisEl.closest('.linkrow')}
              // console.log(thisEl);
              var name = thisEl.find('p.name').text();
              var stor = thisEl.find('p.storage').text();
              if (confirm('Восстановить базу из копии '+name+'?')) {
                $('html,body').addClass('waiting-indicator');
                var out = [
                      {
                        target:{
                                module:'serverman',
                                class:'Control',
                          },
                        param : {
                            _line: 'restoreBase',
                            namefile: name,
                            fromStorage: stor
                            }
                      }
                ]
                call = [(input)=>{
                  $('html,body').removeClass('waiting-indicator');
                  alert('ОК');
                  console.log(input);
                }];
                mxhRequest(out,call)
              }
            });
        box.prepend(link);
      });
    }
  }];

  mxhRequest(out,call);
}



function makeCopy() {
  $('html,body').addClass('waiting-indicator');
  var out = [
        {
          target:{
                  module:'serverman',
                  class:'Control',
            },
          param : {
              _line: 'backupBase',
              }
        }
  ]
  var call = [
    ()=>{
      $('html,body').removeClass('waiting-indicator');
      alert('ОК');
      getFileList()
    }
  ]


  mxhRequest(out,call);
}



function init() {
  console.log('============= manager ============');
  getFileList();

}
