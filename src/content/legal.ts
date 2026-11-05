/**
 * Chính sách quyền riêng tư (/quyen-rieng-tu) và Điều khoản sử dụng (/dieu-khoan). Nội dung phải
 * khớp với cách vsmcclubs xử lý dữ liệu thực tế: khi thay đổi nơi lưu trữ, dữ liệu thu thập hoặc
 * đơn vị cung cấp dịch vụ, cập nhật văn bản này và ngày hiệu lực.
 */
import type { AboutSection } from './about';

export interface LegalDocument {
  title: string;
  lead: string;
  /** Ngày hiệu lực, hiển thị nguyên văn. */
  effective: string;
  sections: AboutSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Chính sách quyền riêng tư',
  lead: 'Văn bản này trình bày dữ liệu mà vsmcclubs lưu trữ, mục đích sử dụng, nơi lưu trữ và quyền của học sinh đối với dữ liệu của mình.',
  effective: '05/11/2026',
  sections: [
    {
      id: 'pham-vi',
      numeral: 'I',
      title: 'Phạm vi áp dụng',
      paragraphs: [
        'Chính sách này áp dụng cho vsmcclubs tại địa chỉ vsmcclubs.site, do Hội đồng Học sinh trường Vinschool Smart City vận hành. vsmcclubs gồm hai phần: trang thông tin sự kiện dành cho mọi học sinh, và Không gian HĐHS dành riêng cho thành viên Hội đồng Học sinh.',
        'vsmcclubs áp dụng nguyên tắc thu thập tối thiểu: chỉ lưu dữ liệu cần thiết cho từng chức năng, không thu thập số điện thoại, địa chỉ nhà, tài khoản mạng xã hội, thông tin sức khỏe hay thông tin tài chính, và không sử dụng dữ liệu cho mục đích quảng cáo.',
      ],
    },
    {
      id: 'tren-thiet-bi',
      numeral: 'II',
      title: 'Dữ liệu lưu trên thiết bị của học sinh',
      paragraphs: [
        'Khi sử dụng trang thông tin sự kiện, học sinh không cần đăng nhập. Hồ sơ và các nội dung học sinh tạo ra chỉ được lưu trong trình duyệt trên thiết bị của học sinh, không được gửi lên máy chủ của vsmcclubs:',
      ],
      bullets: [
        'Hồ sơ: khối, lớp, lĩnh vực quan tâm, mục tiêu trong năm học, thời gian có thể tham gia và số giờ dành cho hoạt động mỗi tuần.',
        'Kế hoạch: các sự kiện đã đăng ký, trạng thái tham gia và lịch cá nhân.',
        'Hồ sơ năng lực: vai trò, số giờ, phần tự đánh giá và minh chứng do học sinh tự nhập.',
        'Cài đặt: giao diện, độ sáng, mật độ chữ và mức độ hiệu ứng.',
      ],
    },
    {
      id: 'xoa-tren-thiet-bi',
      numeral: 'III',
      title: 'Xóa dữ liệu trên thiết bị',
      paragraphs: [
        'Học sinh có thể xóa toàn bộ dữ liệu nêu tại mục II bất kỳ lúc nào bằng chức năng “Xóa dữ liệu trên trình duyệt này” trong mục Tài khoản, hoặc bằng cách xóa dữ liệu trang web trong cài đặt của trình duyệt. Hội đồng Học sinh không có bản sao của các dữ liệu này nên không thể khôi phục sau khi xóa.',
      ],
    },
    {
      id: 'mochi',
      numeral: 'IV',
      title: 'Trợ lý Mochi',
      paragraphs: [
        'Khi học sinh đặt câu hỏi, nội dung câu hỏi cùng thông tin sự kiện liên quan được chuyển qua máy chủ của vsmcclubs tới dịch vụ Claude của Anthropic để tạo câu trả lời. vsmcclubs không lưu nội dung trò chuyện trên máy chủ.',
        'Để giới hạn số câu hỏi mỗi tuần, máy chủ chỉ lưu mã băm của một mã ngẫu nhiên do trình duyệt tạo ra cùng số câu hỏi đã dùng trong tuần; mã này không gắn với họ tên hay tài khoản của học sinh. Địa chỉ IP chỉ được dùng tạm thời trong bộ nhớ để hạn chế số yêu cầu gửi liên tiếp và không được ghi vào cơ sở dữ liệu.',
        'Học sinh không nên nhập họ tên, số điện thoại, địa chỉ hay thông tin cá nhân khác vào Mochi. Mochi được hướng dẫn không yêu cầu các thông tin này.',
      ],
    },
    {
      id: 'khong-gian-hdhs',
      numeral: 'V',
      title: 'Không gian HĐHS',
      paragraphs: [
        'Không gian HĐHS là công cụ nội bộ để Hội đồng Học sinh phân công, theo dõi và đánh giá công việc theo Masterplan của nhiệm kỳ. Chỉ thành viên có tên trong danh sách do Ban điều hành hoặc trưởng ban, phó ban Nhân sự quản lý mới đăng nhập được, bằng tài khoản Google của trường. Việc sử dụng tài khoản trường cho mục đích này đã được nhà trường chấp thuận.',
        'Dữ liệu được lưu trên máy chủ gồm:',
      ],
      bullets: [
        'Thông tin thành viên: họ và tên, lớp, ban, vị trí, trạng thái, ngày tham gia và địa chỉ thư điện tử của trường.',
        'Công việc: tên việc, mô tả, hạn, người thực hiện, đường dẫn sản phẩm đã nộp, đánh giá chất lượng, số lần chỉnh sửa và lý do báo trễ hạn.',
        'Phiếu yêu cầu: người gửi, ban gửi, ban nhận, nội dung, hạn và phản hồi của các yêu cầu giữa các ban.',
        'Nhật ký thao tác: người thực hiện, thao tác và thời điểm, để đối chiếu khi có ý kiến về kết quả đánh giá.',
        'Nhận xét tiến độ hằng tuần của thành viên Ban Nhân sự về các ban được phân công theo dõi, kèm tên người nhận xét.',
        'Bảng điểm hằng tháng: số buổi bắt buộc, có mặt và vắng có phép, điểm hợp tác hoặc điểm theo tiêu chí của trưởng ban, điểm cộng và điểm trừ kèm căn cứ, nhận xét của người chấm, phản hồi của thành viên và ý kiến của Ban điều hành.',
        'Phạm vi xem: mọi thành viên xem được danh sách thành viên của Hội đồng Học sinh, công việc và phiếu yêu cầu của ban mình, công việc ban mình phối hợp và công việc được giao cho mình; công việc của Ban điều hành chỉ Ban điều hành xem được; chỉ Ban điều hành và trưởng ban, phó ban Nhân sự xem được địa chỉ thư điện tử. Mỗi thành viên chỉ xem được điểm của mình sau khi bảng điểm được công bố; người chấm xem điểm của những thành viên mình chấm; thành viên Ban Nhân sự xem điểm và nhận xét tiến độ của các ban được phân công theo dõi; Ban điều hành và trưởng ban, phó ban Nhân sự xem toàn bộ bảng điểm. Nhận xét tiến độ của một ban được đọc bởi trưởng ban, phó ban của ban đó.',
      ],
    },
    {
      id: 'tai-khoan-google',
      numeral: 'VI',
      title: 'Dữ liệu từ tài khoản Google',
      paragraphs: [
        'Khi thành viên đăng nhập Không gian HĐHS, vsmcclubs chỉ yêu cầu các quyền cơ bản của Google (openid, email, profile). Địa chỉ thư điện tử được dùng để đối chiếu với danh sách thành viên và xác định quyền của người đăng nhập. Họ tên và ảnh đại diện do Google cung cấp được dịch vụ xác thực lưu kèm tài khoản nhưng không được vsmcclubs hiển thị hay sử dụng.',
        'vsmcclubs không truy cập thư, tệp trên Google Drive, danh bạ hay lịch của người dùng; không bán, không chia sẻ dữ liệu từ tài khoản Google cho bên thứ ba, không sử dụng cho quảng cáo và không dùng để huấn luyện mô hình trí tuệ nhân tạo. Việc sử dụng dữ liệu nhận được từ các API của Google tuân thủ Chính sách dữ liệu người dùng của Dịch vụ API Google (Google API Services User Data Policy), bao gồm các yêu cầu về Sử dụng giới hạn (Limited Use).',
      ],
    },
    {
      id: 'don-vi-cung-cap',
      numeral: 'VII',
      title: 'Nơi lưu trữ và đơn vị cung cấp dịch vụ',
      paragraphs: ['vsmcclubs sử dụng các dịch vụ sau; mỗi đơn vị chỉ xử lý dữ liệu trong phạm vi cần thiết để cung cấp dịch vụ:'],
      bullets: [
        'Cloudflare: lưu trữ và phân phối trang web, chuyển tiếp câu hỏi gửi tới Mochi.',
        'Supabase: cơ sở dữ liệu và xác thực của Không gian HĐHS, cùng số liệu giới hạn câu hỏi của Mochi; máy chủ đặt tại Singapore.',
        'Anthropic: xử lý câu hỏi gửi tới Mochi để tạo câu trả lời.',
        'Google: xác thực tài khoản trường khi thành viên đăng nhập Không gian HĐHS.',
      ],
    },
    {
      id: 'thoi-gian-luu',
      numeral: 'VIII',
      title: 'Thời gian lưu trữ',
      paragraphs: [
        'Dữ liệu của Không gian HĐHS được lưu trong thời gian thành viên tham gia Hội đồng Học sinh. Khi thành viên rời Hội đồng Học sinh, Ban Nhân sự chuyển thành viên sang trạng thái ngừng hoạt động hoặc xóa thông tin theo đề nghị. Khi kết thúc nhiệm kỳ, Ban điều hành rà soát và xóa những dữ liệu không còn cần thiết cho việc bàn giao.',
        'Số liệu giới hạn câu hỏi của Mochi chỉ có giá trị trong tuần tương ứng.',
      ],
    },
    {
      id: 'bao-mat',
      numeral: 'IX',
      title: 'Bảo mật',
      paragraphs: [
        'Mọi kết nối tới vsmcclubs được mã hóa bằng HTTPS. Cơ sở dữ liệu của Không gian HĐHS không cho phép truy cập trực tiếp từ trình duyệt; mỗi thao tác đều được máy chủ kiểm tra tài khoản và quyền của người thực hiện. Khóa truy cập dịch vụ trí tuệ nhân tạo chỉ được lưu trên máy chủ.',
      ],
    },
    {
      id: 'quyen',
      numeral: 'X',
      title: 'Quyền của học sinh',
      paragraphs: [
        'Thành viên Hội đồng Học sinh có quyền xem dữ liệu của mình trong Không gian HĐHS, đề nghị chỉnh sửa thông tin chưa chính xác và đề nghị xóa thông tin khi rời Hội đồng Học sinh. Đề nghị được gửi tới Ban Nhân sự hoặc Ban điều hành và được xử lý theo quy định pháp luật Việt Nam hiện hành về bảo vệ dữ liệu cá nhân.',
      ],
    },
    {
      id: 'lien-he',
      numeral: 'XI',
      title: 'Liên hệ và thay đổi chính sách',
      paragraphs: [
        'Mọi câu hỏi về chính sách này được gửi tới Ban điều hành Hội đồng Học sinh trường Vinschool Smart City. Khi chính sách thay đổi, nội dung mới được đăng tại trang này kèm ngày hiệu lực mới.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Điều khoản sử dụng',
  lead: 'Văn bản này quy định điều kiện sử dụng vsmcclubs, trách nhiệm của người sử dụng và của Hội đồng Học sinh với tư cách đơn vị vận hành.',
  effective: '05/11/2026',
  sections: [
    {
      id: 'chap-nhan',
      numeral: 'I',
      title: 'Chấp nhận điều khoản',
      paragraphs: [
        'Khi sử dụng vsmcclubs tại địa chỉ vsmcclubs.site, người sử dụng đồng ý với Điều khoản sử dụng này và Chính sách quyền riêng tư. vsmcclubs do Hội đồng Học sinh trường Vinschool Smart City vận hành, không nhằm mục đích thương mại.',
      ],
    },
    {
      id: 'doi-tuong',
      numeral: 'II',
      title: 'Đối tượng sử dụng',
      paragraphs: [
        'Trang thông tin sự kiện dành cho học sinh, phụ huynh, giáo viên và cán bộ nhân viên của nhà trường. Không gian HĐHS chỉ dành cho thành viên Hội đồng Học sinh có tên trong danh sách thành viên, đăng nhập bằng tài khoản Google của trường.',
      ],
    },
    {
      id: 'trach-nhiem',
      numeral: 'III',
      title: 'Trách nhiệm của người sử dụng',
      paragraphs: ['Người sử dụng có trách nhiệm:'],
      bullets: [
        'Cung cấp thông tin chính xác khi đề xuất hoạt động, đăng sự kiện hoặc nộp sản phẩm công việc.',
        'Không chia sẻ tài khoản và không sử dụng tài khoản của người khác.',
        'Không đăng nội dung trái với nội quy nhà trường, xúc phạm người khác hoặc vi phạm quyền sở hữu trí tuệ.',
        'Không tìm cách truy cập dữ liệu, chức năng vượt quá quyền được cấp hoặc làm gián đoạn hoạt động của vsmcclubs.',
        'Giữ bảo mật thông tin nội bộ của Hội đồng Học sinh trong Không gian HĐHS, không sao chép hoặc công bố ra bên ngoài khi chưa được Ban điều hành đồng ý.',
      ],
    },
    {
      id: 'thong-tin-su-kien',
      numeral: 'IV',
      title: 'Thông tin sự kiện',
      paragraphs: [
        'Thông tin sự kiện do các câu lạc bộ, Hội đồng Học sinh và các phòng ban của nhà trường cung cấp. Hội đồng Học sinh kiểm duyệt trước khi công bố nhưng không bảo đảm mọi chi tiết luôn được cập nhật kịp thời; những thông tin chưa xác định được ghi “Đang cập nhật”. Trường hợp có khác biệt, thông báo chính thức của đơn vị tổ chức được áp dụng.',
        'Việc đăng ký trên vsmcclubs giúp học sinh lập kế hoạch cá nhân; học sinh cần hoàn tất thủ tục đăng ký theo hướng dẫn của đơn vị tổ chức.',
      ],
    },
    {
      id: 'mochi',
      numeral: 'V',
      title: 'Trợ lý Mochi',
      paragraphs: [
        'Câu trả lời của Mochi được tạo tự động bởi trí tuệ nhân tạo dựa trên dữ liệu của vsmcclubs, chỉ có giá trị tham khảo và có thể chưa chính xác. Học sinh cần đối chiếu với thông tin sự kiện hoặc đơn vị tổ chức trước khi quyết định. Số câu hỏi được giới hạn theo tuần; khi hết lượt, Mochi chuyển sang chế độ ngoại tuyến.',
      ],
    },
    {
      id: 'khong-gian-hdhs',
      numeral: 'VI',
      title: 'Không gian HĐHS',
      paragraphs: [
        'Dữ liệu trong Không gian HĐHS là hồ sơ công tác nội bộ của Hội đồng Học sinh, được dùng để phân công, theo dõi và đánh giá thành viên theo Masterplan của nhiệm kỳ. Thành viên có ý kiến về công việc được giao hoặc kết quả đánh giá gửi tới trưởng ban hoặc Ban điều hành để được xem xét.',
      ],
    },
    {
      id: 'dich-vu',
      numeral: 'VII',
      title: 'Tính sẵn có của dịch vụ',
      paragraphs: [
        'Hội đồng Học sinh nỗ lực duy trì vsmcclubs hoạt động ổn định nhưng không bảo đảm dịch vụ luôn liên tục, không gián đoạn. Hội đồng Học sinh có thể bổ sung, điều chỉnh hoặc tạm ngừng một số chức năng để bảo trì hoặc theo yêu cầu của nhà trường.',
      ],
    },
    {
      id: 'so-huu',
      numeral: 'VIII',
      title: 'Quyền đối với nội dung',
      paragraphs: [
        'Nội dung giới thiệu, hình ảnh và thông tin sự kiện thuộc về câu lạc bộ hoặc đơn vị đã cung cấp. Khi gửi nội dung lên vsmcclubs, đơn vị cung cấp đồng ý để Hội đồng Học sinh hiển thị nội dung đó trên vsmcclubs nhằm phục vụ học sinh.',
      ],
    },
    {
      id: 'vi-pham',
      numeral: 'IX',
      title: 'Xử lý vi phạm',
      paragraphs: [
        'Khi phát hiện vi phạm Điều khoản sử dụng, Hội đồng Học sinh có thể gỡ nội dung liên quan, tạm ngừng quyền truy cập Không gian HĐHS và báo cáo nhà trường để xử lý theo nội quy.',
      ],
    },
    {
      id: 'thay-doi',
      numeral: 'X',
      title: 'Thay đổi điều khoản và liên hệ',
      paragraphs: [
        'Khi Điều khoản sử dụng thay đổi, nội dung mới được đăng tại trang này kèm ngày hiệu lực mới. Mọi câu hỏi được gửi tới Ban điều hành Hội đồng Học sinh trường Vinschool Smart City.',
      ],
    },
  ],
};
