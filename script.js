 Drupal.behaviors.variationSwitch = {
    attach: function (context, settings) {
      // Загружаем данные вариаций один раз
      if (!window.variationSwitchData) {
        var $variationsData = $("script[data-product-variations]");
        try {
          if ($variationsData.length) {
            window.variationSwitchData = JSON.parse($variationsData.html());
            console.log(
              "variationSwitch: данные загружены",
              window.variationSwitchData.length,
              "вариаций",
            );

            // Создаем карту размеров
            window.variationSizeMap = {};
            window.variationSwitchData.forEach(function (variation) {
              if (variation.size)
                window.variationSizeMap[variation.size] =
                  variation.parametry_izdeliya;
              if (variation.size_id)
                window.variationSizeMap[variation.size_id] =
                  variation.parametry_izdeliya;
            });
            console.log("variationSwitch: карта размеров создана");
          }
        } catch (e) {
          console.error("variationSwitch: ошибка парсинга", e);
        }
      }

      // Функция получения выбранного размера из формы
      function getSelectedSizeFromForm($form) {
        var $selected = $form.find('input[type="radio"]:checked');
        if ($selected.length) {
          var value = $selected.val();
          var $label = $selected.closest(".js-form-item").find("label");
          var label = $label.length ? $label.text().trim() : "";
          return { value: value, label: label };
        }
        return null;
      }

      // Функция обновления параметров
      function updateParametryIzdeliya(paramsHtml) {
        var $wrapper = $(".product-parametry-izdeliya-wrapper");
        if ($wrapper.length && paramsHtml && paramsHtml.trim()) {
          $wrapper.html(`
            <div class="product-parametry-izdeliya">
              <div class="field__label">Параметры изделия</div>
              ${paramsHtml}
            </div>
          `);
          console.log("variationSwitch: параметры обновлены");
          return true;
        }
        return false;
      }

      // Функция обновления параметров из текущей формы
      function updateParamsFromForm() {
        var $form = $(".pt-var");
        if (!$form.length) return false;

        var selected = getSelectedSizeFromForm($form);
        if (selected && window.variationSizeMap) {
          var params =
            window.variationSizeMap[selected.value] ||
            window.variationSizeMap[selected.label];
          if (params) {
            updateParametryIzdeliya(params);
            return true;
          }
        }
        return false;
      }

      // Функция ожидания обновления DOM
      function waitForFormUpdate(callback) {
        // Находим контейнер формы
        var $formContainer = $(".pt-var");
        if (!$formContainer.length) {
          callback();
          return;
        }

        var formContainer = $formContainer[0];
        var observer = new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            // Если были изменения в HTML
            if (mutation.type === "childList" || mutation.type === "subtree") {
              // Проверяем, что радиокнопки обновились
              var $radios = $(formContainer).find('input[type="radio"]');
              if ($radios.length) {
                observer.disconnect();
                console.log(
                  "variationSwitch: DOM обновлен, радиокнопки найдены",
                );
                callback();
              }
            }
          });
        });

        // Наблюдаем за изменениями в форме и ее дочерних элементах
        observer.observe(formContainer, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["checked"],
        });

        // Таймаут на случай, если observer не сработает
        setTimeout(function () {
          observer.disconnect();
          console.log("variationSwitch: таймаут, принудительное обновление");
          callback();
        }, 500);
      }

      // Обработчик клика по радиокнопке
      $(document).on("click", '.pt-var input[type="radio"]', function (e) {
        console.log("variationSwitch: клик по радио, ожидаем обновления DOM");

        // Ждем обновления DOM после AJAX
        setTimeout(function () {
          waitForFormUpdate(function () {
            console.log("variationSwitch: обновляем параметры после клика");
            updateParamsFromForm();
          });
        }, 50);
      });

      // Перехватываем AJAX запросы
      $(document).ajaxSuccess(function (event, xhr, settings) {
        if (settings.url && settings.url.indexOf("system/ajax") !== -1) {
          var responseText = xhr.responseText;
          if (
            responseText &&
            (responseText.indexOf("purchased_entity") !== -1 ||
              responseText.indexOf("attribute_size") !== -1)
          ) {
            console.log(
              "variationSwitch: AJAX запрос завершен, ждем обновления DOM",
            );

            waitForFormUpdate(function () {
              console.log("variationSwitch: обновляем параметры после AJAX");
              updateParamsFromForm();
            });
          }
        }
      });

      // Инициализация при загрузке
      setTimeout(function () {
        updateParamsFromForm();
      }, 100);

      console.log("variationSwitch: инициализация завершена");
    },
  };
