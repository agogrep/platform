function init() {
  // console.log($('#btn_addf'));
  $('#btn_addf').click(function () {addFeild();});
  $('#btn_save').click(function () {
      var lang = $('#lang').val();
      var dict = $('#dict');
      console.log(dict.find('.fbox'));

      var taskList = [
        {class :'sysword',fileName:'sysword'},
        {class:'usedword',fileName: lang + '.ln'}];
      for (var a = 0; a < taskList.length; a++) {
        var list = dict.find('.'+taskList[a].class);
        var text = '';
        list.each((i,el)=>{
          if (i==0) {
            text = el.value;
          }else{
            text += '\n'+el.value;
          }
        });
        // console.log(text);
        download(text,taskList[a].fileName,'text');
      }

  });


  var btn = $('#btn_lmain');
  btn.change(()=>{
    var reader = new FileReader();
    var name = btn[0].files[0].name;
    // console.log('name.split',name.split('.')[1]);
    var part1 = btn[0].files[0].name.split('(')[0];
    var part2 = btn[0].files[0].name.split(')')[1];
    name = part2 ? part1 + part2 : part1;
    // console.log('name','_'+name+'_');
    var typeF = null;
    if (name == 'sysword') {
      typeF ='sysword';
    }else if (name.split('.')[1]=='ln') {
      typeF = 'usedword';
    };
    reader.onload = function() {
      // console.log('res',reader.result);
      var textList = reader.result.split("\n");
      // console.log('textList',textList);
      if (typeF=='sysword') {
        $('#dict').empty();
        for (var i = 0; i < textList.length; i++) {
          var fbox = addFeild();
          fbox.find('.sysword').val(textList[i]);

        }
      }else if (typeF=='usedword') {
          $('#lang').val(name.split('.')[0]);
          var usedwordList = $('#dict .usedword');
          for (var y = 0; y < usedwordList.length; y++) {
            usedwordList.eq(y).val(textList[y]);
          }
      }

    };
    reader.readAsText(btn[0].files[0]);

  });
  $('#btn_delete').click(
      function() {
      var dictList = $('.fbox');
      $(dictList[dictList.length-1]).remove();
  });
};







function addFeild() {
  // console.log('addFeild');
  var dict = $('#dict');
  var fbox = $('<div class = "fbox">'+
              '<input class = "sysword" type = "text">'+
              '<input class = "usedword" type = "text">'+
              '</div>');
  dict.append(fbox);
  fbox.find('.sysword').change((ev)=> {
    var currEl = ev.target;
    var chList = dict.find('.sysword');
      chList.each((i,el)=>{
        if (currEl!=el) {
          if (currEl.value==el.value) {
            alert('такое слово уже есть');
            currEl.value = '';
            $(el).focus();
          }
        }
    })
  })
  return fbox;
}

// Function to download data to a file
function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}
